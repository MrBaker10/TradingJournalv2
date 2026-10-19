import { eq, TransactionRollbackError } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../../index.ts";
import { accounts } from "../../schema/accounts.ts";
import { fxRates } from "../../schema/fx-rates.ts";
import { ledgerEntries } from "../../schema/ledger.ts";
import { users } from "../../schema/users.ts";
import {
  deleteUnusedAccount,
  listAllAccountsForSettings,
} from "../accounts.ts";
import {
  createLedgerEntry,
  deleteLedgerEntry,
  getLedgerTotals,
  LedgerEntryError,
  type LedgerEntryWrite,
  listLedgerAccounts,
  listLedgerEntries,
  listLedgerFilterAccounts,
  updateLedgerEntry,
} from "../ledger.ts";

// Drives the ledger query module against real Postgres, inside a rolled-back
// transaction like the other query tests.

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function fixture(
  body: (tx: Tx, userId: number, otherUserId: number) => Promise<void>,
) {
  try {
    await db.transaction(async (tx) => {
      const [user, other] = await tx
        .insert(users)
        .values([
          {
            username: "ledger-test",
            email: "ledger-test@users.invalid",
            displayName: "Ledger test",
            timezone: "Europe/Berlin",
          },
          {
            username: "ledger-test-other",
            email: "ledger-test-other@users.invalid",
            displayName: "Ledger test other",
            timezone: "Europe/Berlin",
          },
        ])
        .returning({ id: users.id });
      await body(tx, user.id, other.id);
      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }
}

const evaluation: LedgerEntryWrite = {
  entryDate: "2026-10-01",
  kind: "expense",
  category: "evaluation",
  amountCents: 15_000,
  note: "50k evaluation",
  accountId: null,
};

const payout: LedgerEntryWrite = {
  entryDate: "2026-10-12",
  kind: "payout",
  category: null,
  amountCents: 123_456,
  note: null,
  accountId: null,
};

async function addAccount(
  tx: Tx,
  userId: number,
  name: string,
  options: {
    isPractice?: boolean;
    archived?: boolean;
    sortOrder?: number;
  } = {},
): Promise<number> {
  const [account] = await tx
    .insert(accounts)
    .values({
      userId,
      name,
      sortOrder: options.sortOrder ?? 0,
      isPractice: options.isPractice ?? false,
      archivedAt: options.archived ? new Date("2026-10-01T00:00:00Z") : null,
    })
    .returning({ id: accounts.id });
  return account.id;
}

describe("ledger entries", () => {
  it("lists the owner's entries newest first, as entered", async () => {
    await fixture(async (tx, userId) => {
      await createLedgerEntry(userId, evaluation, tx);
      await createLedgerEntry(userId, payout, tx);

      expect(await listLedgerEntries(userId, {}, tx)).toMatchObject([
        {
          entryDate: "2026-10-12",
          kind: "payout",
          category: null,
          amountCents: 123_456,
          note: null,
        },
        {
          entryDate: "2026-10-01",
          kind: "expense",
          category: "evaluation",
          amountCents: 15_000,
          note: "50k evaluation",
        },
      ]);
    });
  });

  it("puts the later-added entry first on the same date", async () => {
    await fixture(async (tx, userId) => {
      const first = await createLedgerEntry(userId, evaluation, tx);
      const second = await createLedgerEntry(
        userId,
        { ...evaluation, category: "data", note: null },
        tx,
      );

      const ids = (await listLedgerEntries(userId, {}, tx)).map((e) => e.id);
      expect(ids).toEqual([second.id, first.id]);
    });
  });

  it("keeps a free reset at zero", async () => {
    await fixture(async (tx, userId) => {
      await createLedgerEntry(
        userId,
        { ...evaluation, category: "reset", amountCents: 0, note: null },
        tx,
      );

      const [entry] = await listLedgerEntries(userId, {}, tx);
      expect(entry).toMatchObject({ category: "reset", amountCents: 0 });
    });
  });

  it("never lists another user's entries", async () => {
    await fixture(async (tx, userId, otherUserId) => {
      await createLedgerEntry(otherUserId, payout, tx);

      expect(await listLedgerEntries(userId, {}, tx)).toEqual([]);
      expect(await listLedgerEntries(otherUserId, {}, tx)).toHaveLength(1);
    });
  });

  it("refuses an expense without a category", async () => {
    await fixture(async (tx, userId) => {
      await expect(
        createLedgerEntry(userId, { ...evaluation, category: null }, tx),
      ).rejects.toThrow(LedgerEntryError);
    });
  });

  it("refuses a payout with a category", async () => {
    await fixture(async (tx, userId) => {
      await expect(
        createLedgerEntry(userId, { ...payout, category: "data" }, tx),
      ).rejects.toThrow(LedgerEntryError);
    });
  });

  it("holds the category rule in the table itself", async () => {
    await fixture(async (tx, userId) => {
      // Bypasses the module to reach the check constraint directly.
      await expect(
        tx.transaction((nested) =>
          nested.insert(ledgerEntries).values({
            userId,
            entryDate: "2026-10-01",
            kind: "payout",
            category: "data",
            amount: "1.00",
          }),
        ),
      ).rejects.toThrow();
      await expect(
        tx.transaction((nested) =>
          nested.insert(ledgerEntries).values({
            userId,
            entryDate: "2026-10-01",
            kind: "expense",
            amount: "-1.00",
            category: "other",
          }),
        ),
      ).rejects.toThrow();
    });
  });
});

describe("ledger entries on an account", () => {
  it("lists an entry with its account's name, and one without as none", async () => {
    await fixture(async (tx, userId) => {
      const accountId = await addAccount(tx, userId, "Lucid 50k");
      await createLedgerEntry(userId, { ...evaluation, accountId }, tx);
      await createLedgerEntry(userId, payout, tx);

      expect(await listLedgerEntries(userId, {}, tx)).toMatchObject([
        { kind: "payout", accountId: null, accountName: null },
        { kind: "expense", accountId, accountName: "Lucid 50k" },
      ]);
    });
  });

  it("refuses a practice, a foreign and an archived account", async () => {
    await fixture(async (tx, userId, otherUserId) => {
      const practice = await addAccount(tx, userId, "Sim", {
        isPractice: true,
      });
      const foreign = await addAccount(tx, otherUserId, "Not mine");
      const archived = await addAccount(tx, userId, "Old eval", {
        archived: true,
      });

      for (const accountId of [practice, foreign, archived]) {
        await expect(
          createLedgerEntry(userId, { ...evaluation, accountId }, tx),
        ).rejects.toThrow(LedgerEntryError);
      }
      expect(await listLedgerEntries(userId, {}, tx)).toEqual([]);
    });
  });

  it("offers only the user's real, active accounts, in selector order", async () => {
    await fixture(async (tx, userId, otherUserId) => {
      const second = await addAccount(tx, userId, "Topstep", { sortOrder: 2 });
      const first = await addAccount(tx, userId, "Lucid", { sortOrder: 1 });
      await addAccount(tx, userId, "Sim", { isPractice: true, sortOrder: 0 });
      await addAccount(tx, userId, "Old", { archived: true, sortOrder: 3 });
      await addAccount(tx, otherUserId, "Not mine");

      expect(await listLedgerAccounts(userId, tx)).toEqual([
        { id: first, name: "Lucid" },
        { id: second, name: "Topstep" },
      ]);
    });
  });

  it("keeps showing an account's name after it is archived", async () => {
    await fixture(async (tx, userId) => {
      const accountId = await addAccount(tx, userId, "Lucid 50k");
      await createLedgerEntry(userId, { ...evaluation, accountId }, tx);
      await tx
        .update(accounts)
        .set({ archivedAt: new Date("2026-10-15T00:00:00Z") })
        .where(eq(accounts.id, accountId));

      const [entry] = await listLedgerEntries(userId, {}, tx);
      expect(entry.accountName).toBe("Lucid 50k");
    });
  });
});

describe("deleting an account for good", () => {
  it("is refused while a ledger entry points at it", async () => {
    await fixture(async (tx, userId) => {
      const accountId = await addAccount(tx, userId, "Lucid 50k", {
        archived: true,
      });
      // Tied while the account was active; the module refuses archived ones.
      await tx.insert(ledgerEntries).values({
        userId,
        accountId,
        entryDate: "2026-09-01",
        kind: "expense",
        category: "evaluation",
        amount: "150.00",
      });

      expect(await deleteUnusedAccount(userId, accountId, tx)).toBe("in-use");
      // Settings knows before anyone clicks: no "Delete permanently" offered.
      const [settingsRow] = await listAllAccountsForSettings(userId, tx);
      expect(settingsRow).toMatchObject({
        hasTrades: false,
        hasLedgerEntries: true,
      });
      expect(await listLedgerEntries(userId, {}, tx)).toHaveLength(1);
    });
  });

  it("deletes an archived account with no trades and no entries", async () => {
    await fixture(async (tx, userId, otherUserId) => {
      const accountId = await addAccount(tx, userId, "Unused", {
        archived: true,
      });

      expect(await deleteUnusedAccount(otherUserId, accountId, tx)).toBe(
        "not-found",
      );
      expect(await deleteUnusedAccount(userId, accountId, tx)).toBe("deleted");
      expect(await deleteUnusedAccount(userId, accountId, tx)).toBe(
        "not-found",
      );
    });
  });
});

describe("ledger totals", () => {
  it("sums payouts and expenses and nets them, in USD as entered", async () => {
    await fixture(async (tx, userId) => {
      await createLedgerEntry(userId, evaluation, tx);
      await createLedgerEntry(
        userId,
        { ...evaluation, category: "reset", amountCents: 9_999 },
        tx,
      );
      await createLedgerEntry(userId, payout, tx);

      expect(await getLedgerTotals(userId, "USD", {}, tx)).toEqual({
        payoutsCents: 123_456,
        expensesCents: 24_999,
        netCents: 98_457,
      });
    });
  });

  it("is zero everywhere without entries", async () => {
    await fixture(async (tx, userId) => {
      expect(await getLedgerTotals(userId, "USD", {}, tx)).toEqual({
        payoutsCents: 0,
        expensesCents: 0,
        netCents: 0,
      });
    });
  });

  it("never counts another user's entries", async () => {
    await fixture(async (tx, userId, otherUserId) => {
      await createLedgerEntry(userId, evaluation, tx);
      await createLedgerEntry(otherUserId, payout, tx);
      await createLedgerEntry(otherUserId, evaluation, tx);

      expect(await getLedgerTotals(userId, "USD", {}, tx)).toEqual({
        payoutsCents: 0,
        expensesCents: 15_000,
        netCents: -15_000,
      });
    });
  });

  it("converts each entry with its own date's ECB rate, rounded per entry", async () => {
    await fixture(async (tx, userId) => {
      // Dates long before any rate the app stores, so nothing collides.
      await tx.insert(fxRates).values([
        { currency: "EUR", rateDate: "2001-06-04", rateVsUsd: "0.800000" },
        { currency: "EUR", rateDate: "2001-06-05", rateVsUsd: "0.900000" },
        { currency: "EUR", rateDate: "2001-06-06", rateVsUsd: "0.600000" },
      ]);
      // $100.00 / 0.8 = €125.00
      await createLedgerEntry(
        userId,
        { ...evaluation, entryDate: "2001-06-04", amountCents: 10_000 },
        tx,
      );
      // $10.01 / 0.9 = €11.1222… → €11.12
      await createLedgerEntry(
        userId,
        { ...payout, entryDate: "2001-06-05", amountCents: 1_001 },
        tx,
      );
      // Twice $0.01 / 0.6 = €0.0166… → €0.02 each, €0.04 together; the
      // rounded sum would be €0.03.
      for (let i = 0; i < 2; i++) {
        await createLedgerEntry(
          userId,
          { ...evaluation, entryDate: "2001-06-06", amountCents: 1 },
          tx,
        );
      }
      // A Saturday has no ECB rate and takes Wednesday's: $6.00 / 0.6 = €10.00
      await createLedgerEntry(
        userId,
        { ...payout, entryDate: "2001-06-09", amountCents: 600 },
        tx,
      );

      expect(await getLedgerTotals(userId, "EUR", {}, tx)).toEqual({
        payoutsCents: 2_112,
        expensesCents: 12_504,
        netCents: -10_392,
      });
    });
  });
});

describe("ledger filter", () => {
  it("narrows list and totals to one account", async () => {
    await fixture(async (tx, userId) => {
      const eval50k = await addAccount(tx, userId, "50k eval");
      const live = await addAccount(tx, userId, "Live", { sortOrder: 1 });
      await createLedgerEntry(
        userId,
        { ...evaluation, accountId: eval50k },
        tx,
      );
      await createLedgerEntry(
        userId,
        { ...payout, accountId: eval50k, amountCents: 40_000 },
        tx,
      );
      await createLedgerEntry(userId, { ...payout, accountId: live }, tx);
      await createLedgerEntry(userId, { ...evaluation, category: "data" }, tx);

      const filter = { accountId: eval50k };
      expect(
        (await listLedgerEntries(userId, filter, tx)).map((e) => e.accountId),
      ).toEqual([eval50k, eval50k]);
      expect(await getLedgerTotals(userId, "USD", filter, tx)).toEqual({
        payoutsCents: 40_000,
        expensesCents: 15_000,
        netCents: 25_000,
      });
    });
  });

  it("narrows list and totals to a range of entry dates, both ends included", async () => {
    await fixture(async (tx, userId) => {
      for (const [entryDate, amountCents] of [
        ["2026-09-30", 1_000],
        ["2026-10-01", 2_000],
        ["2026-10-31", 4_000],
        ["2026-11-01", 8_000],
      ] as const) {
        await createLedgerEntry(
          userId,
          { ...evaluation, entryDate, amountCents },
          tx,
        );
      }

      const october = { from: "2026-10-01", to: "2026-10-31" };
      expect(
        (await listLedgerEntries(userId, october, tx)).map((e) => e.entryDate),
      ).toEqual(["2026-10-31", "2026-10-01"]);
      expect(await getLedgerTotals(userId, "USD", october, tx)).toEqual({
        payoutsCents: 0,
        expensesCents: 6_000,
        netCents: -6_000,
      });
      // Only one end set: open on the other side.
      expect(
        (await getLedgerTotals(userId, "USD", { from: "2026-10-31" }, tx))
          .expensesCents,
      ).toBe(12_000);
    });
  });

  it("combines account and range, and counts entries without an account when no account is set", async () => {
    await fixture(async (tx, userId) => {
      const live = await addAccount(tx, userId, "Live");
      await createLedgerEntry(userId, { ...payout, accountId: live }, tx);
      await createLedgerEntry(
        userId,
        { ...payout, accountId: live, entryDate: "2026-09-12" },
        tx,
      );
      await createLedgerEntry(userId, evaluation, tx);

      const range = { from: "2026-10-01" };
      expect(
        await getLedgerTotals(userId, "USD", { ...range, accountId: live }, tx),
      ).toEqual({ payoutsCents: 123_456, expensesCents: 0, netCents: 123_456 });
      expect(await getLedgerTotals(userId, "USD", range, tx)).toEqual({
        payoutsCents: 123_456,
        expensesCents: 15_000,
        netCents: 108_456,
      });
    });
  });

  it("never reaches another user's entries through their account id", async () => {
    await fixture(async (tx, userId, otherUserId) => {
      const theirs = await addAccount(tx, otherUserId, "Theirs");
      await createLedgerEntry(
        otherUserId,
        { ...payout, accountId: theirs },
        tx,
      );

      const filter = { accountId: theirs };
      expect(await listLedgerEntries(userId, filter, tx)).toEqual([]);
      expect(await getLedgerTotals(userId, "USD", filter, tx)).toEqual({
        payoutsCents: 0,
        expensesCents: 0,
        netCents: 0,
      });
    });
  });

  it("offers real accounts, archived ones only with entries, never practice or another user's", async () => {
    await fixture(async (tx, userId, otherUserId) => {
      const live = await addAccount(tx, userId, "Live", { sortOrder: 2 });
      const eval50k = await addAccount(tx, userId, "50k eval", {
        sortOrder: 1,
      });
      const oldEval = await addAccount(tx, userId, "Old eval", {
        sortOrder: 0,
      });
      await addAccount(tx, userId, "Unused archived", {
        archived: true,
        sortOrder: 3,
      });
      await addAccount(tx, userId, "Sim", { isPractice: true });
      await addAccount(tx, otherUserId, "Theirs");
      await createLedgerEntry(
        userId,
        { ...evaluation, accountId: oldEval },
        tx,
      );
      await tx
        .update(accounts)
        .set({ archivedAt: new Date("2026-10-15T00:00:00Z") })
        .where(eq(accounts.id, oldEval));

      expect(await listLedgerFilterAccounts(userId, tx)).toEqual([
        { id: oldEval, name: "Old eval" },
        { id: eval50k, name: "50k eval" },
        { id: live, name: "Live" },
      ]);
    });
  });
});

describe("editing and deleting entries", () => {
  it("lets the owner change every field", async () => {
    await fixture(async (tx, userId) => {
      const live = await addAccount(tx, userId, "Live");
      const { id } = await createLedgerEntry(userId, evaluation, tx);

      await updateLedgerEntry(
        userId,
        id,
        {
          entryDate: "2026-10-14",
          kind: "payout",
          category: null,
          amountCents: 50_000,
          note: "First payout",
          accountId: live,
        },
        tx,
      );

      expect(await listLedgerEntries(userId, {}, tx)).toMatchObject([
        {
          id,
          entryDate: "2026-10-14",
          kind: "payout",
          category: null,
          amountCents: 50_000,
          note: "First payout",
          accountId: live,
          accountName: "Live",
        },
      ]);
    });
  });

  it("never changes another user's entry", async () => {
    await fixture(async (tx, userId, otherUserId) => {
      const { id } = await createLedgerEntry(otherUserId, evaluation, tx);

      await expect(
        updateLedgerEntry(userId, id, { ...evaluation, amountCents: 1 }, tx),
      ).rejects.toThrow("This entry no longer exists.");
      expect(
        (await listLedgerEntries(otherUserId, {}, tx))[0].amountCents,
      ).toBe(15_000);
    });
  });

  it("keeps an archived account the entry already has", async () => {
    await fixture(async (tx, userId) => {
      const oldEval = await addAccount(tx, userId, "Old eval");
      const { id } = await createLedgerEntry(
        userId,
        { ...evaluation, accountId: oldEval },
        tx,
      );
      await tx
        .update(accounts)
        .set({ archivedAt: new Date("2026-10-15T00:00:00Z") })
        .where(eq(accounts.id, oldEval));

      await updateLedgerEntry(
        userId,
        id,
        { ...evaluation, accountId: oldEval, note: "Fixed typo" },
        tx,
      );

      expect((await listLedgerEntries(userId, {}, tx))[0]).toMatchObject({
        accountId: oldEval,
        note: "Fixed typo",
      });
    });
  });

  it("never keeps a practice account, even one the entry already has", async () => {
    await fixture(async (tx, userId) => {
      const live = await addAccount(tx, userId, "Live");
      const { id } = await createLedgerEntry(
        userId,
        { ...evaluation, accountId: live },
        tx,
      );
      // Ticket 06 locks this switch in the UI; the rule holds without it.
      await tx
        .update(accounts)
        .set({ isPractice: true })
        .where(eq(accounts.id, live));

      await expect(
        updateLedgerEntry(userId, id, { ...evaluation, accountId: live }, tx),
      ).rejects.toThrow(
        "Pick one of your active real accounts, or no account.",
      );
    });
  });

  it("refuses a change to a practice, a foreign or an archived account", async () => {
    await fixture(async (tx, userId, otherUserId) => {
      const sim = await addAccount(tx, userId, "Sim", { isPractice: true });
      const theirs = await addAccount(tx, otherUserId, "Theirs");
      const archived = await addAccount(tx, userId, "Old", { archived: true });
      const { id } = await createLedgerEntry(userId, evaluation, tx);

      for (const accountId of [sim, theirs, archived]) {
        await expect(
          updateLedgerEntry(userId, id, { ...evaluation, accountId }, tx),
        ).rejects.toThrow(LedgerEntryError);
      }
      expect((await listLedgerEntries(userId, {}, tx))[0].accountId).toBe(null);
    });
  });

  it("holds the category rules on update", async () => {
    await fixture(async (tx, userId) => {
      const { id } = await createLedgerEntry(userId, evaluation, tx);

      await expect(
        updateLedgerEntry(userId, id, { ...evaluation, category: null }, tx),
      ).rejects.toThrow(LedgerEntryError);
      await expect(
        updateLedgerEntry(userId, id, { ...payout, category: "data" }, tx),
      ).rejects.toThrow(LedgerEntryError);
    });
  });

  it("deletes the owner's entry, and never another user's", async () => {
    await fixture(async (tx, userId, otherUserId) => {
      const mine = await createLedgerEntry(userId, evaluation, tx);
      const theirs = await createLedgerEntry(otherUserId, payout, tx);

      await deleteLedgerEntry(userId, mine.id, tx);
      await expect(deleteLedgerEntry(userId, theirs.id, tx)).rejects.toThrow(
        LedgerEntryError,
      );

      expect(await listLedgerEntries(userId, {}, tx)).toEqual([]);
      expect(await listLedgerEntries(otherUserId, {}, tx)).toHaveLength(1);
    });
  });
});

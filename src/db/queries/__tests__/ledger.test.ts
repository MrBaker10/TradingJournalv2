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
  getLedgerTotals,
  LedgerEntryError,
  type LedgerEntryWrite,
  listLedgerAccounts,
  listLedgerEntries,
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

      expect(await listLedgerEntries(userId, tx)).toMatchObject([
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

      const ids = (await listLedgerEntries(userId, tx)).map((e) => e.id);
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

      const [entry] = await listLedgerEntries(userId, tx);
      expect(entry).toMatchObject({ category: "reset", amountCents: 0 });
    });
  });

  it("never lists another user's entries", async () => {
    await fixture(async (tx, userId, otherUserId) => {
      await createLedgerEntry(otherUserId, payout, tx);

      expect(await listLedgerEntries(userId, tx)).toEqual([]);
      expect(await listLedgerEntries(otherUserId, tx)).toHaveLength(1);
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

      expect(await listLedgerEntries(userId, tx)).toMatchObject([
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
      expect(await listLedgerEntries(userId, tx)).toEqual([]);
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

      const [entry] = await listLedgerEntries(userId, tx);
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
      expect(await listLedgerEntries(userId, tx)).toHaveLength(1);
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

      expect(await getLedgerTotals(userId, "USD", tx)).toEqual({
        payoutsCents: 123_456,
        expensesCents: 24_999,
        netCents: 98_457,
      });
    });
  });

  it("is zero everywhere without entries", async () => {
    await fixture(async (tx, userId) => {
      expect(await getLedgerTotals(userId, "USD", tx)).toEqual({
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

      expect(await getLedgerTotals(userId, "USD", tx)).toEqual({
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

      expect(await getLedgerTotals(userId, "EUR", tx)).toEqual({
        payoutsCents: 2_112,
        expensesCents: 12_504,
        netCents: -10_392,
      });
    });
  });
});

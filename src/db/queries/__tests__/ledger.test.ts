import { TransactionRollbackError } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../../index.ts";
import { ledgerEntries } from "../../schema/ledger.ts";
import { users } from "../../schema/users.ts";
import {
  createLedgerEntry,
  LedgerEntryError,
  type LedgerEntryWrite,
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
};

const payout: LedgerEntryWrite = {
  entryDate: "2026-10-12",
  kind: "payout",
  category: null,
  amountCents: 123_456,
  note: null,
};

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

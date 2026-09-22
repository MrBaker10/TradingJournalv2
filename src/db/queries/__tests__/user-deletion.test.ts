import { eq, sql, TransactionRollbackError } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../../index.ts";
import { accounts } from "../../schema/accounts.ts";
import { authAccounts, authSessions } from "../../schema/auth.ts";
import { dailyNotes } from "../../schema/daily-notes.ts";
import { importBatches } from "../../schema/import-batches.ts";
import { instruments } from "../../schema/instruments.ts";
import {
  tradeAccounts,
  tradeScreenshots,
  trades,
} from "../../schema/trades.ts";
import { users } from "../../schema/users.ts";

// Account deletion is one DELETE on `users` (Better Auth's deleteUser); the
// ON DELETE CASCADE from migration 0011 has to take everything else with it.
// What is pinned here is the part only Postgres can answer: that the cascade
// reaches every table, and that `trade_accounts → accounts` does not block
// it. That key has no cascade on purpose (an account with trades is archived,
// never deleted); it is deferred instead (0013), so its check waits until the
// cascade through `trades` has removed the assignments.
//
// Runs inside a rolled-back transaction, like the other query tests.

const INSTRUMENT_SYMBOL = "TEST-USER-DELETION";

interface Remaining {
  users: number;
  accounts: number;
  trades: number;
  tradeAccounts: number;
  screenshots: number;
  importBatches: number;
  dailyNotes: number;
  authAccounts: number;
  authSessions: number;
}

async function deleteFixtureUser(): Promise<Remaining> {
  let remaining: Remaining | null = null;

  try {
    await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          username: "deletion-fixture",
          email: "deletion-fixture@users.invalid",
          displayName: "Deletion Fixture",
          timezone: "UTC",
        })
        .returning({ id: users.id });

      const [instrument] = await tx
        .insert(instruments)
        .values({
          symbol: INSTRUMENT_SYMBOL,
          name: "Throwaway test instrument",
          pointValue: "50",
          tickSize: "0.25",
        })
        .returning({ id: instruments.id });

      const [account] = await tx
        .insert(accounts)
        .values({ userId: user.id, name: "Live", sortOrder: 0 })
        .returning({ id: accounts.id });

      // The user's selector points at their own account — a second path
      // from `users` to `accounts` the cascade has to cope with.
      await tx
        .update(users)
        .set({ selectedAccountId: account.id })
        .where(eq(users.id, user.id));

      const [batch] = await tx
        .insert(importBatches)
        .values({
          userId: user.id,
          accountId: account.id,
          filename: "fixture.csv",
          rowCount: 1,
          detectedShape: "fills",
        })
        .returning({ id: importBatches.id });

      const [trade] = await tx
        .insert(trades)
        .values({
          userId: user.id,
          tradeDate: "2026-09-03",
          instrumentId: instrument.id,
          taken: true,
          contracts: 1,
          entryTime: "09:00",
          exitTime: "09:30",
          direction: "long",
          entryPrice: "100",
          exitPrice: "110",
          importBatchId: batch.id,
        })
        .returning({ id: trades.id });

      await tx
        .insert(tradeAccounts)
        .values({ tradeId: trade.id, accountId: account.id });
      await tx.insert(tradeScreenshots).values({
        tradeId: trade.id,
        storageKey: `screenshots/${user.id}/${trade.id}/fixture.jpg`,
        sortOrder: 0,
      });
      await tx
        .insert(dailyNotes)
        .values({ userId: user.id, noteDate: "2026-09-03" });
      await tx.insert(authAccounts).values({
        userId: user.id,
        accountId: String(user.id),
        providerId: "credential",
        password: "not-a-real-hash",
      });
      await tx.insert(authSessions).values({
        userId: user.id,
        token: "deletion-fixture-token",
        expiresAt: new Date("2099-01-01T00:00:00Z"),
      });

      await tx.delete(users).where(eq(users.id, user.id));

      const countWhere = async (rows: Promise<unknown[]>): Promise<number> =>
        (await rows).length;

      remaining = {
        users: await countWhere(
          tx.select().from(users).where(eq(users.id, user.id)),
        ),
        accounts: await countWhere(
          tx.select().from(accounts).where(eq(accounts.userId, user.id)),
        ),
        trades: await countWhere(
          tx.select().from(trades).where(eq(trades.userId, user.id)),
        ),
        tradeAccounts: await countWhere(
          tx
            .select()
            .from(tradeAccounts)
            .where(eq(tradeAccounts.accountId, account.id)),
        ),
        screenshots: await countWhere(
          tx
            .select()
            .from(tradeScreenshots)
            .where(eq(tradeScreenshots.tradeId, trade.id)),
        ),
        importBatches: await countWhere(
          tx
            .select()
            .from(importBatches)
            .where(eq(importBatches.userId, user.id)),
        ),
        dailyNotes: await countWhere(
          tx.select().from(dailyNotes).where(eq(dailyNotes.userId, user.id)),
        ),
        authAccounts: await countWhere(
          tx
            .select()
            .from(authAccounts)
            .where(eq(authAccounts.userId, user.id)),
        ),
        authSessions: await countWhere(
          tx
            .select()
            .from(authSessions)
            .where(eq(authSessions.userId, user.id)),
        ),
      };
      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }

  if (remaining === null) throw new Error("Fixture never produced a result");
  return remaining;
}

describe("deleting a user", () => {
  it("removes every row that belongs to them, in one statement", async () => {
    expect(await deleteFixtureUser()).toEqual({
      users: 0,
      accounts: 0,
      trades: 0,
      tradeAccounts: 0,
      screenshots: 0,
      importBatches: 0,
      dailyNotes: 0,
      authAccounts: 0,
      authSessions: 0,
    });
  });
});

describe("deleting a trading account", () => {
  it("is still refused while a trade is assigned to it", async () => {
    // The cascade on users must not have loosened the archive rule: a plain
    // DELETE on an account with trades keeps failing at the database.
    let refused = false;

    try {
      await db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({
            username: "account-delete-fixture",
            email: "account-delete-fixture@users.invalid",
            displayName: "Account Delete Fixture",
            timezone: "UTC",
          })
          .returning({ id: users.id });
        const [instrument] = await tx
          .insert(instruments)
          .values({
            symbol: INSTRUMENT_SYMBOL,
            name: "Throwaway test instrument",
            pointValue: "50",
            tickSize: "0.25",
          })
          .returning({ id: instruments.id });
        const [account] = await tx
          .insert(accounts)
          .values({ userId: user.id, name: "Live", sortOrder: 0 })
          .returning({ id: accounts.id });
        const [trade] = await tx
          .insert(trades)
          .values({
            userId: user.id,
            tradeDate: "2026-09-03",
            instrumentId: instrument.id,
            taken: true,
            contracts: 1,
            entryTime: "09:00",
            exitTime: "09:30",
            direction: "long",
            entryPrice: "100",
            exitPrice: "110",
          })
          .returning({ id: trades.id });
        await tx
          .insert(tradeAccounts)
          .values({ tradeId: trade.id, accountId: account.id });

        // The key is DEFERRABLE INITIALLY DEFERRED (0013), so the check
        // would only run at commit — which this rolled-back transaction
        // never reaches. Forcing it now asks the same question commit would.
        try {
          await tx.delete(accounts).where(eq(accounts.id, account.id));
          await tx.execute(sql`set constraints all immediate`);
        } catch {
          refused = true;
        }
        tx.rollback();
      });
    } catch (error) {
      if (!(error instanceof TransactionRollbackError)) {
        // The failed DELETE aborts the transaction; Postgres then rejects the
        // rollback's follow-up as well. Either way nothing was committed.
        refused = true;
      }
    }

    expect(refused).toBe(true);
  });
});

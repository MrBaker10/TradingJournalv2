import { eq, sql, TransactionRollbackError } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../index.ts";
import { accounts } from "../../schema/accounts.ts";
import { instruments } from "../../schema/instruments.ts";
import { tradeAccounts, trades } from "../../schema/trades.ts";
import { users } from "../../schema/users.ts";
import { updateAccountCurrency, updateStartingBalance } from "../accounts.ts";
import { getStartingBalanceCents } from "../dashboard.ts";

// Where the equity curve starts (account-balance, decided 2026-09-25): an
// account's own balance, or the sum over the real accounts — archived ones
// included, practice ones never. Every case runs in a rolled-back transaction
// on a user of its own.

let dbReachable = false;

beforeAll(async () => {
  try {
    await db.execute(sql`select 1`);
    dbReachable = true;
  } catch {
    dbReachable = false;
  }
});

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function inRollback<T>(body: (tx: Tx) => Promise<T>): Promise<T> {
  let result: T | undefined;
  try {
    await db.transaction(async (tx) => {
      result = await body(tx);
      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }
  return result as T;
}

async function newUser(tx: Tx, name: string) {
  const [user] = await tx
    .insert(users)
    .values({
      username: name,
      email: `${name}@users.invalid`,
      displayName: name,
      timezone: "Europe/Berlin",
    })
    .returning({ id: users.id });
  return user.id;
}

async function account(
  tx: Tx,
  userId: number,
  values: {
    name: string;
    usd: string;
    isPractice?: boolean;
    archived?: boolean;
  },
) {
  const [row] = await tx
    .insert(accounts)
    .values({
      userId,
      name: values.name,
      sortOrder: 0,
      isPractice: values.isPractice ?? false,
      startingBalance: values.usd,
      startingBalanceUsd: values.usd,
      archivedAt: values.archived ? new Date("2026-09-01T00:00:00Z") : null,
    })
    .returning({ id: accounts.id });
  return row.id;
}

describe("getStartingBalanceCents", () => {
  it("sums the real accounts, archived included, practice excluded", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const userId = await newUser(tx, "balance-sum");
      await account(tx, userId, { name: "Eval", usd: "50000.00" });
      await account(tx, userId, { name: "Funded", usd: "100000.00" });
      await account(tx, userId, {
        name: "Old eval",
        usd: "25000.00",
        archived: true,
      });
      await account(tx, userId, {
        name: "Sim",
        usd: "1000000.00",
        isPractice: true,
      });
      return getStartingBalanceCents({ userId, selectedAccountId: null }, tx);
    });

    expect(result).toBe(17_500_000); // $175,000
  });

  it("gives a selected account its own balance, a practice account too", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const userId = await newUser(tx, "balance-single");
      const real = await account(tx, userId, { name: "Eval", usd: "50000.00" });
      const sim = await account(tx, userId, {
        name: "Sim",
        usd: "1234.56",
        isPractice: true,
      });
      return {
        real: await getStartingBalanceCents(
          { userId, selectedAccountId: real },
          tx,
        ),
        sim: await getStartingBalanceCents(
          { userId, selectedAccountId: sim },
          tx,
        ),
      };
    });

    expect(result).toEqual({ real: 5_000_000, sim: 123_456 });
  });

  it("reads nothing of another user's accounts", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const owner = await newUser(tx, "balance-owner");
      const other = await newUser(tx, "balance-other");
      const foreign = await account(tx, owner, {
        name: "Eval",
        usd: "50000.00",
      });
      return {
        combined: await getStartingBalanceCents(
          { userId: other, selectedAccountId: null },
          tx,
        ),
        selected: await getStartingBalanceCents(
          { userId: other, selectedAccountId: foreign },
          tx,
        ),
      };
    });

    expect(result).toEqual({ combined: 0, selected: 0 });
  });

  it("is 0 for a user without any balance", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const userId = await newUser(tx, "balance-none");
      await tx
        .insert(accounts)
        .values({ userId, name: "Default", sortOrder: 0 });
      return getStartingBalanceCents({ userId, selectedAccountId: null }, tx);
    });

    expect(result).toBe(0);
  });
});

describe("updateStartingBalance", () => {
  it("writes amount, USD value and rate date on an owned account only", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const owner = await newUser(tx, "balance-write");
      const other = await newUser(tx, "balance-write-other");
      const id = await account(tx, owner, { name: "FTMO", usd: "0.00" });
      const balance = {
        amountCents: 10_000_000,
        usdCents: 11_460_000,
        rateDate: "2026-09-18",
      };
      const foreign = await updateStartingBalance(other, id, balance, tx);
      const own = await updateStartingBalance(owner, id, balance, tx);
      const [row] = await tx
        .select({
          startingBalance: accounts.startingBalance,
          startingBalanceUsd: accounts.startingBalanceUsd,
          startingBalanceRateDate: accounts.startingBalanceRateDate,
        })
        .from(accounts)
        .where(eq(accounts.id, id));
      return { foreign, own, row };
    });

    expect(result.foreign).toBe(false);
    expect(result.own).toBe(true);
    expect(result.row).toEqual({
      startingBalance: "100000.00",
      startingBalanceUsd: "114600.00",
      startingBalanceRateDate: "2026-09-18",
    });
  });
});

describe("updateAccountCurrency with a starting balance", () => {
  it("converts the balance again in the same statement", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const userId = await newUser(tx, "balance-currency");
      const id = await account(tx, userId, { name: "FTMO", usd: "100000.00" });
      const updated = await updateAccountCurrency(userId, id, "EUR", tx, {
        amountCents: 10_000_000,
        usdCents: 11_460_000,
        rateDate: "2026-09-18",
      });
      const [row] = await tx
        .select({
          currency: accounts.currency,
          startingBalance: accounts.startingBalance,
          startingBalanceUsd: accounts.startingBalanceUsd,
        })
        .from(accounts)
        .where(eq(accounts.id, id));
      return { updated, row };
    });

    expect(result).toEqual({
      updated: true,
      row: {
        currency: "EUR",
        startingBalance: "100000.00",
        startingBalanceUsd: "114600.00",
      },
    });
  });

  it("leaves the balance alone when the lock refuses the change", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const userId = await newUser(tx, "balance-locked");
      const id = await account(tx, userId, { name: "Eval", usd: "50000.00" });
      const [instrument] = await tx
        .insert(instruments)
        .values({
          symbol: "TEST-BALANCE-LOCK",
          name: "Throwaway test instrument",
          pointValue: "2",
          tickSize: "0.25",
        })
        .returning({ id: instruments.id });
      const [trade] = await tx
        .insert(trades)
        .values({
          userId,
          tradeDate: "2026-09-01",
          instrumentId: instrument.id,
          taken: true,
          contracts: "1",
          entryTime: "09:31:00",
          direction: "long",
          entryPrice: "100.0000",
        })
        .returning({ id: trades.id });
      await tx
        .insert(tradeAccounts)
        .values({ tradeId: trade.id, accountId: id });

      const updated = await updateAccountCurrency(userId, id, "EUR", tx, {
        amountCents: 5_000_000,
        usdCents: 5_730_000,
        rateDate: "2026-09-18",
      });
      const [row] = await tx
        .select({ usd: accounts.startingBalanceUsd })
        .from(accounts)
        .where(eq(accounts.id, id));
      return { updated, usd: row.usd };
    });

    expect(result).toEqual({ updated: false, usd: "50000.00" });
  });
});

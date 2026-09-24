import { and, eq, sql, TransactionRollbackError } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import type { ForeignCurrency, FxRate } from "../../../domain/fx.ts";
import { db } from "../../index.ts";
import { accounts } from "../../schema/accounts.ts";
import { fxRates } from "../../schema/fx-rates.ts";
import { instruments } from "../../schema/instruments.ts";
import { tradeAccounts, trades } from "../../schema/trades.ts";
import { users } from "../../schema/users.ts";
import { updateAccountCurrency } from "../accounts.ts";
import { ensureFxRates } from "../fx.ts";

// Two rules that only hold if Postgres says so: the upsert behind
// ensureFxRates, and the currency lock that lives inside an UPDATE's WHERE.
// Every case runs inside a transaction that is always rolled back.
//
// The rate dates sit in 2001 so no rate a developer fetched locally can land
// in the window and change what counts as missing.

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

// Friday, then Monday and Tuesday — the ECB publishes nothing on a weekend.
const source: FxRate[] = [
  { date: "2001-03-09", rateVsUsd: "0.9312" },
  { date: "2001-03-12", rateVsUsd: "0.9265" },
  { date: "2001-03-13", rateVsUsd: "0.9181" },
];

function recordingFetcher(rates: FxRate[]) {
  const calls: { currency: ForeignCurrency; from: string; to: string }[] = [];
  const fetcher = async (
    currency: ForeignCurrency,
    from: string,
    to: string,
  ) => {
    calls.push({ currency, from, to });
    return rates.filter((rate) => rate.date >= from && rate.date <= to);
  };
  return { calls, fetcher };
}

describe("ensureFxRates", () => {
  it("fetches once, stores the rates, and does not fetch again", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const { calls, fetcher } = recordingFetcher(source);
      const dates = ["2001-03-09", "2001-03-10", "2001-03-12"];

      const first = await ensureFxRates("EUR", dates, fetcher, tx);
      const second = await ensureFxRates("EUR", dates, fetcher, tx);
      return { calls, first, second };
    });

    expect(result.calls).toEqual([
      { currency: "EUR", from: "2001-03-02", to: "2001-03-12" },
    ]);
    // numeric(12, 6) hands the rate back padded to its scale. The fetch ends
    // at the last date asked for, so Tuesday is not stored.
    expect(result.first).toEqual([
      { date: "2001-03-09", rateVsUsd: "0.931200" },
      { date: "2001-03-12", rateVsUsd: "0.926500" },
    ]);
    expect(result.second).toEqual(result.first);
  });

  it("fetches again for a date past the last stored rate", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const calls = await inRollback(async (tx) => {
      const { calls, fetcher } = recordingFetcher(source);
      await ensureFxRates("EUR", ["2001-03-09"], fetcher, tx);
      // Only Friday stored so far; Monday may have a rate of its own.
      await tx
        .delete(fxRates)
        .where(
          and(
            eq(fxRates.currency, "EUR"),
            sql`${fxRates.rateDate} > '2001-03-09'`,
          ),
        );
      await ensureFxRates("EUR", ["2001-03-12"], fetcher, tx);
      return calls;
    });

    expect(calls).toHaveLength(2);
    expect(calls[1]).toEqual({
      currency: "EUR",
      from: "2001-03-05",
      to: "2001-03-12",
    });
  });

  it("overwrites a stored rate the source has revised", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const stored = await inRollback(async (tx) => {
      await tx
        .insert(fxRates)
        .values({ currency: "EUR", rateDate: "2001-03-09", rateVsUsd: "1" });
      const { fetcher } = recordingFetcher(source);
      // Monday is not settled, and its fetch window reaches back over Friday.
      return ensureFxRates("EUR", ["2001-03-12"], fetcher, tx);
    });

    expect(stored[0]).toEqual({ date: "2001-03-09", rateVsUsd: "0.931200" });
  });

  it("does not call the source for no dates", async () => {
    const { calls, fetcher } = recordingFetcher(source);
    expect(await ensureFxRates("EUR", [], fetcher)).toEqual([]);
    expect(calls).toEqual([]);
  });
});

describe("updateAccountCurrency", () => {
  async function seed(tx: Tx) {
    const [user] = await tx
      .insert(users)
      .values({
        username: "fx-fixture",
        email: "fx-fixture@users.invalid",
        displayName: "FX Fixture",
        timezone: "UTC",
      })
      .returning({ id: users.id });
    const [other] = await tx
      .insert(users)
      .values({
        username: "fx-stranger",
        email: "fx-stranger@users.invalid",
        displayName: "Stranger",
        timezone: "UTC",
      })
      .returning({ id: users.id });
    const [account] = await tx
      .insert(accounts)
      .values({ userId: user.id, name: "FTMO", sortOrder: 0 })
      .returning({ id: accounts.id, currency: accounts.currency });
    return { userId: user.id, otherUserId: other.id, account };
  }

  async function currencyOf(tx: Tx, accountId: number) {
    const [row] = await tx
      .select({ currency: accounts.currency })
      .from(accounts)
      .where(eq(accounts.id, accountId));
    return row.currency;
  }

  it("defaults a new account to USD and changes it while no trade is assigned", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const { userId, account } = await seed(tx);
      const toEur = await updateAccountCurrency(userId, account.id, "EUR", tx);
      const afterEur = await currencyOf(tx, account.id);
      const toUsd = await updateAccountCurrency(userId, account.id, "USD", tx);
      const afterUsd = await currencyOf(tx, account.id);
      return { initial: account.currency, toEur, afterEur, toUsd, afterUsd };
    });

    expect(result).toEqual({
      initial: "USD",
      toEur: true,
      afterEur: "EUR",
      toUsd: true,
      afterUsd: "USD",
    });
  });

  it("refuses once a trade is assigned", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const { userId, account } = await seed(tx);
      const [instrument] = await tx
        .insert(instruments)
        .values({
          symbol: "TEST-FX-LOCK",
          name: "Throwaway test instrument",
          pointValue: "2",
          tickSize: "0.25",
        })
        .returning({ id: instruments.id });
      const [trade] = await tx
        .insert(trades)
        .values({
          userId,
          tradeDate: "2026-03-02",
          instrumentId: instrument.id,
          taken: true,
          contracts: 1,
          entryTime: "09:31:00",
          direction: "long",
          entryPrice: "100.0000",
        })
        .returning({ id: trades.id });
      await tx
        .insert(tradeAccounts)
        .values({ tradeId: trade.id, accountId: account.id });

      const updated = await updateAccountCurrency(
        userId,
        account.id,
        "EUR",
        tx,
      );
      return { updated, currency: await currencyOf(tx, account.id) };
    });

    expect(result).toEqual({ updated: false, currency: "USD" });
  });

  it("refuses an account the user does not own", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const { otherUserId, account } = await seed(tx);
      const updated = await updateAccountCurrency(
        otherUserId,
        account.id,
        "EUR",
        tx,
      );
      return { updated, currency: await currencyOf(tx, account.id) };
    });

    expect(result).toEqual({ updated: false, currency: "USD" });
  });

  it("rejects a currency outside the list at the database", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    await expect(
      inRollback(async (tx) => {
        const { account } = await seed(tx);
        await tx.execute(
          sql`update accounts set currency = 'GBP' where id = ${account.id}`,
        );
      }),
    ).rejects.toThrow();
  });
});

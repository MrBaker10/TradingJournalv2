import { and, eq, sql, TransactionRollbackError } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import type { ForeignCurrency, FxRate } from "../../../domain/fx.ts";
import { runFxJob } from "../../../lib/fx/job.ts";
import { db } from "../../index.ts";
import { accounts } from "../../schema/accounts.ts";
import { fxRates } from "../../schema/fx-rates.ts";
import { importBatches } from "../../schema/import-batches.ts";
import { instruments } from "../../schema/instruments.ts";
import { tradeAccounts, trades } from "../../schema/trades.ts";
import { users } from "../../schema/users.ts";
import { updateAccountCurrency } from "../accounts.ts";
import {
  applyFxCorrections,
  ensureFxRates,
  listConvertedTrades,
} from "../fx.ts";

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
          contracts: "1",
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

describe("job:fx", () => {
  // An EUR account with one import batch. Wednesday 2001-03-14 had a rate
  // when the trades were imported; Thursday 2001-03-15, the trade date, did
  // not yet.
  const published: FxRate[] = [
    { date: "2001-03-14", rateVsUsd: "0.9100" },
    { date: "2001-03-15", rateVsUsd: "0.9200" },
  ];

  async function importFixture(tx: Tx) {
    const [user] = await tx.select({ id: users.id }).from(users).limit(1);
    if (!user) throw new Error("No seeded user — run `pnpm db:seed` first");
    const [account] = await tx
      .insert(accounts)
      .values({
        userId: user.id,
        name: "FX job target",
        sortOrder: 950,
        currency: "EUR",
      })
      .returning({ id: accounts.id });
    const [instrument] = await tx
      .insert(instruments)
      .values({
        symbol: "TEST-FX-JOB",
        name: "Throwaway test instrument",
        pointValue: "1",
        tickSize: "0.01",
      })
      .returning({ id: instruments.id });
    const [batch] = await tx
      .insert(importBatches)
      .values({
        userId: user.id,
        accountId: account.id,
        filename: "ftmo.csv",
        rowCount: 2,
        detectedShape: "ftmo",
      })
      .returning({ id: importBatches.id });
    await tx
      .insert(fxRates)
      .values({ currency: "EUR", rateDate: "2001-03-14", rateVsUsd: "0.9100" });

    const trade = (pnlSource: string | null, pnlOverride: string) => ({
      userId: user.id,
      tradeDate: "2001-03-15",
      instrumentId: instrument.id,
      taken: true,
      contracts: "1.88",
      entryTime: "11:20:09",
      exitTime: "11:20:48",
      direction: "long",
      entryPrice: "100.0000",
      exitPrice: "101.0000",
      pnlOverride,
      pnlSource,
      fxRateDate: "2001-03-14",
      importBatchId: batch.id,
    });

    const [provisional, handEdited] = await tx
      .insert(trades)
      .values([
        // 56.76 EUR at Wednesday's 0.91 = 51.65 USD, provisional.
        trade("56.76", "51.65"),
        // The same, but the user has typed their own P&L since.
        trade(null, "40.00"),
      ])
      .returning({ id: trades.id });
    await tx.insert(tradeAccounts).values([
      { tradeId: provisional.id, accountId: account.id },
      { tradeId: handEdited.id, accountId: account.id },
    ]);

    return { provisional: provisional.id, handEdited: handEdited.id };
  }

  async function stored(tx: Tx, id: number) {
    const [row] = await tx
      .select({
        pnlOverride: trades.pnlOverride,
        fxRateDate: trades.fxRateDate,
        pnlSource: trades.pnlSource,
      })
      .from(trades)
      .where(eq(trades.id, id));
    return row;
  }

  it("lists a provisional import, not one whose P&L was edited by hand", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const ids = await importFixture(tx);
      const listed = await listConvertedTrades(tx);
      return { ids, listedIds: listed.map((trade) => trade.id), listed };
    });

    expect(result.listedIds).toContain(result.ids.provisional);
    expect(result.listedIds).not.toContain(result.ids.handEdited);
    expect(
      result.listed.find((trade) => trade.id === result.ids.provisional),
    ).toMatchObject({
      tradeDate: "2001-03-15",
      fxRateDate: "2001-03-14",
      pnlSource: "56.76",
      currency: "EUR",
    });
  });

  it("converts the provisional trade again once the day's rate exists", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const ids = await importFixture(tx);
      const { fetcher } = recordingFetcher(published);
      await runFxJob(fetcher, tx);
      return {
        provisional: await stored(tx, ids.provisional),
        handEdited: await stored(tx, ids.handEdited),
      };
    });

    // 56.76 EUR at Thursday's 0.92 = 52.2192 -> 52.22 USD.
    expect(result.provisional).toEqual({
      pnlOverride: "52.22",
      fxRateDate: "2001-03-15",
      pnlSource: "56.76",
    });
    // Hand edit wins: the job never touched it.
    expect(result.handEdited).toEqual({
      pnlOverride: "40.00",
      fxRateDate: "2001-03-14",
      pnlSource: null,
    });
  });

  it("leaves the trade provisional while the day's rate is still missing", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const ids = await importFixture(tx);
      const { fetcher } = recordingFetcher(published.slice(0, 1));
      await runFxJob(fetcher, tx);
      return stored(tx, ids.provisional);
    });

    expect(result).toEqual({
      pnlOverride: "51.65",
      fxRateDate: "2001-03-14",
      pnlSource: "56.76",
    });
  });

  it("fetches the rate of a hand-logged trade on the EUR account", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const ids = await importFixture(tx);
      // A second trade on the same account, eleven days later, logged by hand: no
      // pnl_source, so only display-currency needs its rate. More than seven
      // days after the last stored rate: within seven, datesNeedingFetch
      // counts a day as settled once any later rate is stored — here the
      // developer's own 2026 rates would be — which is a known limit of that
      // rule (decisions.md, display-currency), not what this case is about.
      const [{ id: _id, createdAt: _c, updatedAt: _u, ...base }] = await tx
        .select()
        .from(trades)
        .where(eq(trades.id, ids.handEdited));
      const [late] = await tx
        .insert(trades)
        .values({
          ...base,
          tradeDate: "2001-03-26",
          importBatchId: null,
          fxRateDate: null,
        })
        .returning({ id: trades.id });
      const [assignment] = await tx
        .select({ accountId: tradeAccounts.accountId })
        .from(tradeAccounts)
        .where(eq(tradeAccounts.tradeId, ids.handEdited));
      await tx
        .insert(tradeAccounts)
        .values({ tradeId: late.id, accountId: assignment.accountId });

      const { fetcher } = recordingFetcher([
        ...published,
        { date: "2001-03-26", rateVsUsd: "0.9050" },
      ]);
      await runFxJob(fetcher, tx);
      const [stored] = await tx
        .select({ rate: fxRates.rateVsUsd })
        .from(fxRates)
        .where(
          and(eq(fxRates.currency, "EUR"), eq(fxRates.rateDate, "2001-03-26")),
        );
      return stored?.rate ?? null;
    });

    expect(result).toBe("0.905000");
  });

  it("skips a correction whose trade changed since it was read", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const ids = await importFixture(tx);
      const written = await applyFxCorrections(
        [
          {
            tradeId: ids.provisional,
            fromRateDate: "2001-03-13",
            toRateDate: "2001-03-15",
            usdCents: 5222,
          },
          {
            tradeId: ids.handEdited,
            fromRateDate: "2001-03-14",
            toRateDate: "2001-03-15",
            usdCents: 5222,
          },
        ],
        tx,
      );
      return {
        written,
        provisional: await stored(tx, ids.provisional),
        handEdited: await stored(tx, ids.handEdited),
      };
    });

    expect(result.written).toBe(0);
    expect(result.provisional.pnlOverride).toBe("51.65");
    expect(result.handEdited.pnlOverride).toBe("40.00");
  });
});

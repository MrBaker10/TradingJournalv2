import { and, eq, sql, TransactionRollbackError } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { calculatePnl, type PnlInput } from "../../../domain/pnl.ts";
import { dollarsToCents } from "../../../lib/money.ts";
import { db } from "../../index.ts";
import { accounts } from "../../schema/accounts.ts";
import { fxRates } from "../../schema/fx-rates.ts";
import { instruments } from "../../schema/instruments.ts";
import { tradeAccounts, trades } from "../../schema/trades.ts";
import { users } from "../../schema/users.ts";
import {
  isVisibleForAccount,
  profitRateText,
  rMultipleSortKey,
  tradePnlCents,
} from "../trades.ts";

// Test-only symbol, never committed (every fixture runs inside a rolled-back
// transaction) — distinctive enough that it can't collide with a seeded
// instrument's real symbol.
const TEST_INSTRUMENT_SYMBOL = "TEST-R-SORT-KEY";

interface TradeFixture {
  taken: boolean;
  direction: "long" | "short";
  entryPrice: number;
  exitPrice: number | null;
  stopPrice: number | null;
  contracts: number | null;
  pointValue: number;
  pnlOverride?: number;
  mfeR?: number;
  /** The instrument's profit currency with the rate stored for the trade date. */
  profit?: { currency: string; rateVsUsd: string };
}

let dbReachable = false;

beforeAll(async () => {
  try {
    await db.execute(sql`select 1`);
    dbReachable = true;
  } catch {
    dbReachable = false;
  }
});

interface SqlEvaluation {
  r: number | null;
  pnlCents: number | null;
  profitRate: string | null;
}

// Inserts a throwaway instrument + trade for the fixture, reads the exact
// rMultipleSortKey and tradePnlCents exports that the journal list and the
// dashboard use in production, then always rolls back — no trace left in the
// local dev database. This is a formula-parity check against real Postgres
// NUMERIC arithmetic, not a JS stand-in for it: the whole point is that no
// second copy of the formula exists anywhere, in SQL or in JS.
async function evaluateSql(fixture: TradeFixture): Promise<SqlEvaluation> {
  let result: SqlEvaluation = { r: null, pnlCents: null, profitRate: null };

  try {
    await db.transaction(async (tx) => {
      const [user] = await tx.select({ id: users.id }).from(users).limit(1);
      if (!user) {
        throw new Error(
          "No seeded user found — run `pnpm db:seed` before this test",
        );
      }

      const [instrument] = await tx
        .insert(instruments)
        .values({
          symbol: TEST_INSTRUMENT_SYMBOL,
          name: "Throwaway test instrument",
          pointValue: String(fixture.pointValue),
          tickSize: "0.25",
          profitCurrency: fixture.profit?.currency ?? "USD",
        })
        .returning({ id: instruments.id });

      if (fixture.profit !== undefined) {
        // On the trade date itself, so it is the latest one on or before it
        // whatever else the local table holds; rolled back with the rest.
        await tx
          .insert(fxRates)
          .values({
            currency: fixture.profit.currency,
            rateDate: "2026-01-01",
            rateVsUsd: fixture.profit.rateVsUsd,
          })
          .onConflictDoUpdate({
            target: [fxRates.currency, fxRates.rateDate],
            set: { rateVsUsd: fixture.profit.rateVsUsd },
          });
      }

      const [trade] = await tx
        .insert(trades)
        .values({
          userId: user.id,
          tradeDate: "2026-01-01",
          instrumentId: instrument.id,
          taken: fixture.taken,
          contracts:
            fixture.contracts === null ? null : String(fixture.contracts),
          entryTime: "09:00",
          exitTime: fixture.exitPrice !== null ? "09:30" : null,
          direction: fixture.direction,
          entryPrice: String(fixture.entryPrice),
          exitPrice:
            fixture.exitPrice !== null ? String(fixture.exitPrice) : null,
          stopPrice:
            fixture.stopPrice !== null ? String(fixture.stopPrice) : null,
          mfeR: fixture.mfeR !== undefined ? String(fixture.mfeR) : null,
          pnlOverride:
            fixture.pnlOverride !== undefined
              ? String(fixture.pnlOverride)
              : null,
        })
        .returning({ id: trades.id });

      const [row] = await tx
        .select({
          r: rMultipleSortKey,
          pnlCents: tradePnlCents,
          profitRate: profitRateText,
        })
        .from(trades)
        .innerJoin(instruments, eq(trades.instrumentId, instruments.id))
        .where(eq(trades.id, trade.id));

      result = {
        r: row.r === null ? null : Number(row.r),
        pnlCents: row.pnlCents === null ? null : Number(row.pnlCents),
        profitRate: row.profitRate,
      };

      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) {
      throw error;
    }
  }

  return result;
}

async function evaluateSqlRMultiple(
  fixture: TradeFixture,
): Promise<number | null> {
  return (await evaluateSql(fixture)).r;
}

async function evaluateSqlPnlCents(
  fixture: TradeFixture,
): Promise<number | null> {
  return (await evaluateSql(fixture)).pnlCents;
}

function toPnlInput(fixture: TradeFixture): PnlInput {
  return {
    direction: fixture.direction,
    entryPrice: fixture.entryPrice,
    exitPrice: fixture.exitPrice as number,
    contracts: fixture.contracts as number,
    pointValue: fixture.pointValue,
    stopPrice: fixture.stopPrice ?? undefined,
    profitRateVsUsd: fixture.profit?.rateVsUsd,
  };
}

describe("rMultipleSortKey (SQL, run against real Postgres) vs calculatePnl (pnl.ts)", () => {
  it("agrees on a winning long trade with a stop", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const fixture: TradeFixture = {
      taken: true,
      direction: "long",
      entryPrice: 5000,
      exitPrice: 5010,
      stopPrice: 4995,
      contracts: 1,
      pointValue: 50,
    };
    const domain = calculatePnl(toPnlInput(fixture));
    const sqlResult = await evaluateSqlRMultiple(fixture);
    expect(sqlResult).toBeCloseTo(domain.rMultiple as number, 6);
  });

  it("agrees on a losing short trade with contracts > 1", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const fixture: TradeFixture = {
      taken: true,
      direction: "short",
      entryPrice: 5000,
      exitPrice: 5010,
      stopPrice: 5005,
      contracts: 2,
      pointValue: 50,
    };
    const domain = calculatePnl(toPnlInput(fixture));
    const sqlResult = await evaluateSqlRMultiple(fixture);
    expect(sqlResult).toBeCloseTo(domain.rMultiple as number, 6);
  });

  it("agrees when a P&L override is set", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const fixture: TradeFixture = {
      taken: true,
      direction: "long",
      entryPrice: 5000,
      exitPrice: 5010,
      stopPrice: 4995,
      contracts: 1,
      pointValue: 50,
      pnlOverride: 1000,
    };
    const domain = calculatePnl(
      toPnlInput(fixture),
      fixture.pnlOverride && fixture.pnlOverride * 100,
    );
    const sqlResult = await evaluateSqlRMultiple(fixture);
    expect(sqlResult).toBeCloseTo(domain.rMultiple as number, 6);
  });

  it("is null when there is no stop price, like calculatePnl", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const fixture: TradeFixture = {
      taken: true,
      direction: "long",
      entryPrice: 5000,
      exitPrice: 5010,
      stopPrice: null,
      contracts: 1,
      pointValue: 50,
    };
    const sqlResult = await evaluateSqlRMultiple(fixture);
    expect(sqlResult).toBeNull();
  });

  it("is null when the stop equals the entry, like calculatePnl", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const fixture: TradeFixture = {
      taken: true,
      direction: "long",
      entryPrice: 5000,
      exitPrice: 5010,
      stopPrice: 5000,
      contracts: 1,
      pointValue: 50,
    };
    const sqlResult = await evaluateSqlRMultiple(fixture);
    expect(sqlResult).toBeNull();
  });

  it("falls back to mfe_r as the would-be R for a missed setup", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const fixture: TradeFixture = {
      taken: false,
      direction: "long",
      entryPrice: 5000,
      exitPrice: null,
      stopPrice: null,
      contracts: null,
      pointValue: 50,
      mfeR: 1.8,
    };
    const sqlResult = await evaluateSqlRMultiple(fixture);
    expect(sqlResult).toBeCloseTo(1.8, 6);
  });
});

describe("tradePnlCents (SQL, run against real Postgres) vs calculatePnl (pnl.ts)", () => {
  it("agrees on a winning long trade", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const fixture: TradeFixture = {
      taken: true,
      direction: "long",
      entryPrice: 5000,
      exitPrice: 5010,
      stopPrice: 4995,
      contracts: 1,
      pointValue: 50,
    };
    const domain = calculatePnl(toPnlInput(fixture));
    expect(await evaluateSqlPnlCents(fixture)).toBe(domain.pnlCents);
  });

  it("agrees on a losing short trade with contracts > 1", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const fixture: TradeFixture = {
      taken: true,
      direction: "short",
      entryPrice: 5000,
      exitPrice: 5010,
      stopPrice: 5005,
      contracts: 3,
      pointValue: 50,
    };
    const domain = calculatePnl(toPnlInput(fixture));
    expect(await evaluateSqlPnlCents(fixture)).toBe(domain.pnlCents);
  });

  // Four decimals on the price and a fractional point value push the result
  // off a whole cent, which is where a rounding difference between
  // floor(x + 0.5) in SQL and Math.round in dollarsToCents would show up.
  it("agrees on a sub-cent result that has to be rounded", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const fixture: TradeFixture = {
      taken: true,
      direction: "long",
      entryPrice: 1.2345,
      exitPrice: 1.2378,
      stopPrice: 1.23,
      contracts: 1,
      pointValue: 12.5,
    };
    const domain = calculatePnl(toPnlInput(fixture));
    expect(await evaluateSqlPnlCents(fixture)).toBe(domain.pnlCents);
  });

  it("agrees on a negative sub-cent result", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const fixture: TradeFixture = {
      taken: true,
      direction: "short",
      entryPrice: 1.2345,
      exitPrice: 1.2378,
      stopPrice: 1.24,
      contracts: 1,
      pointValue: 12.5,
    };
    const domain = calculatePnl(toPnlInput(fixture));
    expect(await evaluateSqlPnlCents(fixture)).toBe(domain.pnlCents);
  });

  it("takes the override over the derived value, like calculatePnl", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const fixture: TradeFixture = {
      taken: true,
      direction: "long",
      entryPrice: 5000,
      exitPrice: 5010,
      stopPrice: 4995,
      contracts: 1,
      pointValue: 50,
      pnlOverride: 123.45,
    };
    const domain = calculatePnl(
      toPnlInput(fixture),
      dollarsToCents(fixture.pnlOverride as number),
    );
    expect(await evaluateSqlPnlCents(fixture)).toBe(domain.pnlCents);
    expect(await evaluateSqlPnlCents(fixture)).toBe(12345);
  });

  it("is null for a missed setup, which carries no money at all", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const fixture: TradeFixture = {
      taken: false,
      direction: "long",
      entryPrice: 5000,
      exitPrice: null,
      stopPrice: null,
      contracts: null,
      pointValue: 50,
      mfeR: 1.8,
    };
    expect(await evaluateSqlPnlCents(fixture)).toBeNull();
  });

  it("is null for a taken trade that has no exit yet", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const fixture: TradeFixture = {
      taken: true,
      direction: "long",
      entryPrice: 5000,
      exitPrice: null,
      stopPrice: 4995,
      contracts: 1,
      pointValue: 50,
    };
    expect(await evaluateSqlPnlCents(fixture)).toBeNull();
  });

  // A CFD trades in lots: the quantity is numeric(12, 4) now, and the SQL
  // multiplies by it in NUMERIC while pnl.ts scales it into BigInt. Both have
  // to land on the same cent, including a half cent on either side of zero.
  it.for([
    ["the FTMO sample's 15-lot sell", "short", 30191.72, 30187.38, 15, 1],
    ["fractional lots", "long", 30203.38, 30204.03, 7.56, 1],
    ["gold at 0.05 lots", "short", 4334.78, 4328.21, 0.05, 100],
    ["a gain that ends on half a cent", "long", 100, 100.01, 0.5, 1],
    ["a loss that ends on half a cent", "long", 100.01, 100, 0.5, 1],
    ["four decimals on the quantity", "long", 1.2345, 1.2378, 1.3333, 12.5],
  ] as const)(
    "agrees on %s",
    async ([
      ,
      direction,
      entryPrice,
      exitPrice,
      contracts,
      pointValue,
    ], ctx) => {
      ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

      const fixture: TradeFixture = {
        taken: true,
        direction,
        entryPrice,
        exitPrice,
        stopPrice: null,
        contracts,
        pointValue,
      };
      const domain = calculatePnl(toPnlInput(fixture));
      expect(await evaluateSqlPnlCents(fixture)).toBe(domain.pnlCents);
    },
  );
});

// Five decimals on the price and a P&L in the instrument's profit currency
// (ftmo-cfd-instruments): SQL multiplies by the stored rate in NUMERIC,
// pnl.ts in BigInt, and both round once afterwards.
describe("tradePnlCents vs calculatePnl — five decimals and profit currency", () => {
  it.for([
    ["EURUSD at five decimals", "long", 1.08453, 1.08553, 1, 100_000, null],
    [
      "a pipette on a micro lot",
      "short",
      1.23457,
      1.23456,
      0.01,
      100_000,
      null,
    ],
    [
      "USDJPY in yen",
      "long",
      157.1,
      157.6,
      1,
      100_000,
      ["JPY", "0.0062950656"],
    ],
    [
      "a yen loss",
      "short",
      157.1,
      157.6,
      0.37,
      100_000,
      ["JPY", "0.0062950656"],
    ],
    ["GER40.cash in euro", "short", 24000.5, 23990.25, 1, 1, ["EUR", "1.1403"]],
    [
      "half a cent after converting",
      "long",
      100,
      100.001,
      1,
      1000,
      ["JPY", "0.005"],
    ],
    [
      "minus half a cent after converting",
      "short",
      100,
      100.001,
      1,
      1000,
      ["JPY", "0.005"],
    ],
  ] as const)(
    "agrees on %s",
    async ([
      ,
      direction,
      entryPrice,
      exitPrice,
      contracts,
      pointValue,
      profit,
    ], ctx) => {
      ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

      const fixture: TradeFixture = {
        taken: true,
        direction,
        entryPrice,
        exitPrice,
        stopPrice: null,
        contracts,
        pointValue,
        profit:
          profit === null
            ? undefined
            : { currency: profit[0], rateVsUsd: profit[1] },
      };
      const domain = calculatePnl(toPnlInput(fixture));
      expect(await evaluateSqlPnlCents(fixture)).toBe(domain.pnlCents);
    },
  );

  it("converts the derived value but never the USD override", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const fixture: TradeFixture = {
      taken: true,
      direction: "long",
      entryPrice: 157.1,
      exitPrice: 157.6,
      stopPrice: 156.85,
      contracts: 1,
      pointValue: 100_000,
      pnlOverride: 123.45,
      profit: { currency: "JPY", rateVsUsd: "0.0062950656" },
    };
    expect(await evaluateSqlPnlCents(fixture)).toBe(12345);
  });

  it("keeps R the same in the profit currency", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const fixture: TradeFixture = {
      taken: true,
      direction: "long",
      entryPrice: 157.1,
      exitPrice: 157.6,
      stopPrice: 156.85,
      contracts: 1,
      pointValue: 100_000,
      profit: { currency: "JPY", rateVsUsd: "0.0062950656" },
    };
    expect(await evaluateSqlRMultiple(fixture)).toBeCloseTo(2, 10);
  });

  // Every FTMO import writes a USD override. The risk from the prices is in
  // the profit currency, so it has to be converted too, or R comes out as
  // USD over yen (review 2026-09-26).
  it.for([
    ["USDJPY", 157.1, 157.6, 156.85, 100_000, "JPY", "0.0062950656", 314.75],
    ["GER40.cash", 24000.5, 24010.5, 23995.5, 1, "EUR", "1.1403", 11.4],
  ] as const)(
    "agrees on R for %s with a USD override",
    async ([
      ,
      entryPrice,
      exitPrice,
      stopPrice,
      pointValue,
      currency,
      rate,
      override,
    ], ctx) => {
      ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

      const fixture: TradeFixture = {
        taken: true,
        direction: "long",
        entryPrice,
        exitPrice,
        stopPrice,
        contracts: 1,
        pointValue,
        pnlOverride: override,
        profit: { currency, rateVsUsd: rate },
      };
      const domain = calculatePnl(
        toPnlInput(fixture),
        dollarsToCents(override),
      );
      expect(domain.rMultiple).toBeCloseTo(2, 1);
      expect(await evaluateSqlRMultiple(fixture)).toBeCloseTo(
        domain.rMultiple as number,
        2,
      );
    },
  );

  it("hands calculatePnl the rate SQL used, and none for USD", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const base: TradeFixture = {
      taken: true,
      direction: "long",
      entryPrice: 157.1,
      exitPrice: 157.6,
      stopPrice: null,
      contracts: 1,
      pointValue: 100_000,
    };
    const yen = await evaluateSql({
      ...base,
      profit: { currency: "JPY", rateVsUsd: "0.0062950656" },
    });
    expect(Number(yen.profitRate)).toBe(0.0062950656);
    expect((await evaluateSql(base)).profitRate).toBeNull();
  });
});

// Design.md §4.9 and project-structure.md: a missed setup carries no account
// at all, so selecting one must not make it disappear. It used to: the
// single-account branch of queryTradeRows inner-joined trade_accounts, and a
// row with no join partner is a row that is gone.
describe("isVisibleForAccount", () => {
  async function visibleTradeIds(select: "own" | "other"): Promise<string[]> {
    let labels: string[] = [];

    try {
      await db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({
            username: "account-visibility-fixture",
            email: "account-visibility-fixture@users.invalid",
            displayName: "Account Visibility",
            timezone: "UTC",
          })
          .returning({ id: users.id });

        const [mine, theirs] = await tx
          .insert(accounts)
          .values([
            { userId: user.id, name: "Mine", sortOrder: 0 },
            { userId: user.id, name: "Theirs", sortOrder: 1 },
          ])
          .returning({ id: accounts.id });

        const [instrument] = await tx
          .insert(instruments)
          .values({
            symbol: "TEST-ACCOUNT-VISIBILITY",
            name: "Throwaway test instrument",
            pointValue: "50",
            tickSize: "0.25",
          })
          .returning({ id: instruments.id });

        const base = {
          userId: user.id,
          tradeDate: "2026-01-01",
          instrumentId: instrument.id,
          entryTime: "09:00",
          direction: "long",
          entryPrice: "100",
        };

        const [taken] = await tx
          .insert(trades)
          .values({ ...base, taken: true, contracts: "1", notes: "taken" })
          .returning({ id: trades.id });
        await tx
          .insert(trades)
          .values({ ...base, taken: false, notes: "missed" });

        // Only the taken trade gets an account — a missed setup cannot have one.
        await tx
          .insert(tradeAccounts)
          .values({ tradeId: taken.id, accountId: mine.id });

        const rows = await tx
          .select({ notes: trades.notes })
          .from(trades)
          .where(
            and(
              eq(trades.userId, user.id),
              isVisibleForAccount(select === "own" ? mine.id : theirs.id),
            ),
          );

        labels = rows.map((row) => row.notes ?? "").sort();
        tx.rollback();
      });
    } catch (error) {
      if (!(error instanceof TransactionRollbackError)) throw error;
    }

    return labels;
  }

  it("shows the missed setup alongside a trade on the selected account", async () => {
    expect(await visibleTradeIds("own")).toEqual(["missed", "taken"]);
  });

  it("still shows the missed setup when another account is selected", async () => {
    // The taken trade drops out — it belongs to a different account. The
    // missed setup stays, because it belongs to none.
    expect(await visibleTradeIds("other")).toEqual(["missed"]);
  });
});

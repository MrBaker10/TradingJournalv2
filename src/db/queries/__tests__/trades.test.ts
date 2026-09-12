import { eq, sql, TransactionRollbackError } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { calculatePnl, type PnlInput } from "../../../domain/pnl.ts";
import { dollarsToCents } from "../../../lib/money.ts";
import { db } from "../../index.ts";
import { instruments } from "../../schema/instruments.ts";
import { trades } from "../../schema/trades.ts";
import { users } from "../../schema/users.ts";
import { rMultipleSortKey, tradePnlCents } from "../trades.ts";

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
}

// Inserts a throwaway instrument + trade for the fixture, reads the exact
// rMultipleSortKey and tradePnlCents exports that the journal list and the
// dashboard use in production, then always rolls back — no trace left in the
// local dev database. This is a formula-parity check against real Postgres
// NUMERIC arithmetic, not a JS stand-in for it: the whole point is that no
// second copy of the formula exists anywhere, in SQL or in JS.
async function evaluateSql(fixture: TradeFixture): Promise<SqlEvaluation> {
  let result: SqlEvaluation = { r: null, pnlCents: null };

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
        })
        .returning({ id: instruments.id });

      const [trade] = await tx
        .insert(trades)
        .values({
          userId: user.id,
          tradeDate: "2026-01-01",
          instrumentId: instrument.id,
          taken: fixture.taken,
          contracts: fixture.contracts,
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
        .select({ r: rMultipleSortKey, pnlCents: tradePnlCents })
        .from(trades)
        .innerJoin(instruments, eq(trades.instrumentId, instruments.id))
        .where(eq(trades.id, trade.id));

      result = {
        r: row.r === null ? null : Number(row.r),
        pnlCents: row.pnlCents === null ? null : Number(row.pnlCents),
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
});

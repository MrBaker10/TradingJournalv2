import { sql, TransactionRollbackError } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../../db/index.ts";
import type { FxRate } from "../../../domain/fx.ts";
import { convertToUsd } from "../convert.ts";

// Rates in 2001, so nothing a developer fetched locally lands in the window.
// Every case runs in a rolled-back transaction.

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

const source: FxRate[] = [
  { date: "2001-03-09", rateVsUsd: "0.9312" },
  { date: "2001-03-12", rateVsUsd: "0.9265" },
];

const fetcher = async (_currency: string, from: string, to: string) =>
  source.filter((rate) => rate.date >= from && rate.date <= to);

describe("convertToUsd", () => {
  it("converts each amount with the rate of its own date", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback((tx) =>
      convertToUsd(
        "EUR",
        [
          { cents: 10_000, date: "2001-03-09" },
          { cents: -5_000, date: "2001-03-10" }, // Saturday: Friday's rate
          { cents: 10_000, date: "2001-03-12" },
        ],
        fetcher,
        tx,
      ),
    );

    expect(result).toEqual({
      ok: true,
      conversions: [
        { usdCents: 9_312, rateDate: "2001-03-09", provisional: false },
        { usdCents: -4_656, rateDate: "2001-03-09", provisional: false },
        { usdCents: 9_265, rateDate: "2001-03-12", provisional: false },
      ],
    });
  });

  it("names the amount it has no rate for", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback((tx) =>
      convertToUsd(
        "EUR",
        [
          { cents: 10_000, date: "2001-03-09" },
          { cents: 10_000, date: "2001-01-02" },
        ],
        fetcher,
        tx,
      ),
    );

    expect(result).toEqual({
      ok: false,
      reason: "no-rate",
      index: 1,
      date: "2001-01-02",
    });
  });

  it("reports an unreachable source without converting anything", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const failing = async () => {
      throw new Error("network down");
    };
    const result = await inRollback((tx) =>
      convertToUsd("EUR", [{ cents: 10_000, date: "2001-04-02" }], failing, tx),
    );

    expect(result).toEqual({ ok: false, reason: "unavailable" });
  });

  it("does nothing for no amounts", async () => {
    let called = false;
    const result = await convertToUsd("EUR", [], async () => {
      called = true;
      return [];
    });
    expect(result).toEqual({ ok: true, conversions: [] });
    expect(called).toBe(false);
  });
});

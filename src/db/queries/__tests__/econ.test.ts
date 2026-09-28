import { sql, TransactionRollbackError } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import type { EconEvent } from "../../../domain/econ.ts";
import { runEconJob } from "../../../lib/econ/job.ts";
import { db } from "../../index.ts";
import { econEvents } from "../../schema/econ-events.ts";
import {
  listEconCurrencies,
  listEconEvents,
  replaceEconEvents,
} from "../econ.ts";

// The replace and the filters only mean something against Postgres. Every
// case runs inside a transaction that is always rolled back, so the synced
// calendar a developer has locally survives the test run.

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

function event(
  occursAt: string,
  currency: string,
  title: string,
  impact = "Low",
): EconEvent {
  return {
    occursAt: new Date(occursAt),
    currency,
    title,
    impact,
    forecast: null,
    previous: null,
  };
}

// The feed week of 2026-09-28: [09-27 04:00Z, 10-04 04:00Z).
const week = {
  from: new Date("2026-09-27T04:00:00Z"),
  to: new Date("2026-10-04T04:00:00Z"),
};

const calendar = [
  event("2026-09-29T04:30:00Z", "AUD", "Cash Rate", "High"),
  event("2026-09-28T13:30:00Z", "EUR", "Lagarde Speaks", "Medium"),
  event("2026-09-27T23:50:00Z", "JPY", "SPPI y/y"),
  event("2026-10-02T12:30:00Z", "USD", "Non-Farm Employment Change", "High"),
  event("2026-09-30T12:00:00Z", "CAD", "Bank Holiday", "Holiday"),
  // Exactly on the next week's start: not this week.
  event("2026-10-04T04:00:00Z", "USD", "Next Week Opener", "High"),
  // A second before this week's start: not this week either.
  event("2026-09-27T03:59:59Z", "NZD", "Last Week Straggler"),
];

const all = { ...week, highOnly: false, currencies: [] };

describe("replaceEconEvents", () => {
  it("leaves exactly the new events, old ones gone", async () => {
    if (!dbReachable) return;
    const titles = await inRollback(async (tx) => {
      await replaceEconEvents(
        [event("2001-01-01T00:00:00Z", "USD", "Stale")],
        tx,
      );
      await replaceEconEvents(calendar, tx);
      const rows = await tx
        .select({ title: econEvents.title })
        .from(econEvents);
      return rows.map((row) => row.title).sort();
    });
    expect(titles).toEqual(calendar.map((row) => row.title).sort());
  });

  it("empties the table for an empty calendar", async () => {
    if (!dbReachable) return;
    const count = await inRollback(async (tx) => {
      await replaceEconEvents(calendar, tx);
      await replaceEconEvents([], tx);
      return (await tx.select().from(econEvents)).length;
    });
    expect(count).toBe(0);
  });
});

describe("listEconEvents", () => {
  it("returns the half-open week in time order", async () => {
    if (!dbReachable) return;
    const rows = await inRollback(async (tx) => {
      await replaceEconEvents(calendar, tx);
      return listEconEvents(all, tx);
    });
    expect(rows.map((row) => row.title)).toEqual([
      "SPPI y/y",
      "Lagarde Speaks",
      "Cash Rate",
      "Bank Holiday",
      "Non-Farm Employment Change",
    ]);
    expect(rows[0]?.occursAt).toEqual(new Date("2026-09-27T23:50:00Z"));
  });

  it("keeps High only, dropping Holiday", async () => {
    if (!dbReachable) return;
    const rows = await inRollback(async (tx) => {
      await replaceEconEvents(calendar, tx);
      return listEconEvents({ ...all, highOnly: true }, tx);
    });
    expect(rows.map((row) => row.title)).toEqual([
      "Cash Rate",
      "Non-Farm Employment Change",
    ]);
  });

  it("widens with each currency and narrows with High impact", async () => {
    if (!dbReachable) return;
    const [usd, usdEur, usdEurHigh] = await inRollback(async (tx) => {
      await replaceEconEvents(calendar, tx);
      return Promise.all([
        listEconEvents({ ...all, currencies: ["USD"] }, tx),
        listEconEvents({ ...all, currencies: ["USD", "EUR"] }, tx),
        listEconEvents(
          { ...all, currencies: ["USD", "EUR"], highOnly: true },
          tx,
        ),
      ]);
    });
    expect(usd.map((row) => row.title)).toEqual(["Non-Farm Employment Change"]);
    expect(usdEur.map((row) => row.title)).toEqual([
      "Lagarde Speaks",
      "Non-Farm Employment Change",
    ]);
    expect(usdEurHigh.map((row) => row.title)).toEqual([
      "Non-Farm Employment Change",
    ]);
  });
});

describe("listEconCurrencies", () => {
  it("lists the week's currencies once each, sorted", async () => {
    if (!dbReachable) return;
    const currencies = await inRollback(async (tx) => {
      await replaceEconEvents(calendar, tx);
      return listEconCurrencies(week, tx);
    });
    expect(currencies).toEqual(["AUD", "CAD", "EUR", "JPY", "USD"]);
  });
});

describe("runEconJob", () => {
  const thisWeek = calendar.slice(0, 5);
  const nextWeek = [calendar[5] as EconEvent];

  it("writes both weeks", async () => {
    if (!dbReachable) return;
    const [result, count] = await inRollback(async (tx) => {
      const result = await runEconJob(
        async (week) => (week === "this" ? thisWeek : nextWeek),
        tx,
      );
      return [result, (await tx.select().from(econEvents)).length] as const;
    });
    expect(result).toEqual({ thisWeek: 5, nextWeek: 1 });
    expect(count).toBe(6);
  });

  it("writes this week alone while next week is unpublished", async () => {
    if (!dbReachable) return;
    const [result, count] = await inRollback(async (tx) => {
      const result = await runEconJob(
        async (week) => (week === "this" ? thisWeek : null),
        tx,
      );
      return [result, (await tx.select().from(econEvents)).length] as const;
    });
    expect(result).toEqual({ thisWeek: 5, nextWeek: null });
    expect(count).toBe(5);
  });

  it("keeps the old calendar when a fetch fails", async () => {
    if (!dbReachable) return;
    const [error, count] = await inRollback(async (tx) => {
      await replaceEconEvents(calendar, tx);
      const error = await runEconJob(async (week) => {
        if (week === "next") throw new Error("HTTP 503");
        return thisWeek;
      }, tx).catch((caught: unknown) => caught);
      return [error, (await tx.select().from(econEvents)).length] as const;
    });
    expect(error).toBeInstanceOf(Error);
    expect(count).toBe(calendar.length);
  });

  it("refuses a missing current week", async () => {
    if (!dbReachable) return;
    const [error, count] = await inRollback(async (tx) => {
      await replaceEconEvents(calendar, tx);
      const error = await runEconJob(async () => null, tx).catch(
        (caught: unknown) => caught,
      );
      return [error, (await tx.select().from(econEvents)).length] as const;
    });
    expect(String(error)).toMatch(/this week/);
    expect(count).toBe(calendar.length);
  });
});

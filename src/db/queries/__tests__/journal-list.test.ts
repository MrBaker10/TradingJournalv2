import { sql, TransactionRollbackError } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../index.ts";
import { accounts } from "../../schema/accounts.ts";
import { instruments } from "../../schema/instruments.ts";
import { tradeAccounts, trades } from "../../schema/trades.ts";
import { users } from "../../schema/users.ts";
import {
  type JournalFilters,
  type JournalTradesResult,
  listJournalTrades,
} from "../trades.ts";

// The journal list read against real Postgres: day values and ordering are
// SQL, so they are pinned here rather than against a stand-in. Every fixture
// runs inside a transaction that is always rolled back.

let dbReachable = false;

beforeAll(async () => {
  try {
    await db.execute(sql`select 1`);
    dbReachable = true;
  } catch {
    dbReachable = false;
  }
});

interface ListTrade {
  tradeDate: string;
  /** Fixture account names; a missed setup has none. */
  on?: string[];
  taken?: boolean;
  entryTime?: string;
  /** Which fixture instrument, "A" when left out. */
  instrument?: "A" | "B";
  notes?: string;
}

interface ListFixture {
  /** Account name to `is_practice`. */
  accounts?: Record<string, boolean>;
  trades: ListTrade[];
  /** A fixture account name; "All accounts" when left out. */
  selected?: string;
  filters?: Partial<
    Pick<JournalFilters, "sortBy" | "sortDir" | "page" | "dateFrom" | "dateTo">
  > & { instrument?: "A" | "B" };
}

async function listFor(fixture: ListFixture): Promise<JournalTradesResult> {
  let result: JournalTradesResult | null = null;

  try {
    await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          username: "journal-list-fixture",
          email: "journal-list-fixture@users.invalid",
          displayName: "Journal List Fixture",
          timezone: "UTC",
        })
        .returning({ id: users.id });

      const instrumentIds = new Map<string, number>();
      for (const key of ["A", "B"] as const) {
        const [instrument] = await tx
          .insert(instruments)
          .values({
            symbol: `TEST-JOURNAL-LIST-${key}`,
            name: "Throwaway test instrument",
            pointValue: "50",
            tickSize: "0.25",
          })
          .returning({ id: instruments.id });
        instrumentIds.set(key, instrument.id);
      }

      const accountIds = new Map<string, number>();
      let sortOrder = 0;
      for (const [name, isPractice] of Object.entries(
        fixture.accounts ?? { Live: false },
      )) {
        const [account] = await tx
          .insert(accounts)
          .values({ userId: user.id, name, sortOrder: sortOrder++, isPractice })
          .returning({ id: accounts.id });
        accountIds.set(name, account.id);
      }

      for (const listTrade of fixture.trades) {
        const taken = listTrade.taken ?? true;
        const [trade] = await tx
          .insert(trades)
          .values({
            userId: user.id,
            tradeDate: listTrade.tradeDate,
            instrumentId: instrumentIds.get(listTrade.instrument ?? "A") ?? 0,
            taken,
            contracts: taken ? "1" : null,
            entryTime: listTrade.entryTime ?? "09:00",
            exitTime: taken ? "15:00" : null,
            direction: "long",
            entryPrice: "100",
            exitPrice: taken ? "110" : null,
            notes: listTrade.notes ?? null,
          })
          .returning({ id: trades.id });

        for (const name of listTrade.on ?? (taken ? ["Live"] : [])) {
          const accountId = accountIds.get(name);
          if (accountId === undefined) {
            throw new Error(`Fixture account "${name}" was never created`);
          }
          await tx
            .insert(tradeAccounts)
            .values({ tradeId: trade.id, accountId });
        }
      }

      const { instrument, ...filters } = fixture.filters ?? {};
      result = await listJournalTrades(
        {
          userId: user.id,
          selectedAccountId:
            fixture.selected === undefined
              ? null
              : (accountIds.get(fixture.selected) ?? null),
          sortBy: "date",
          sortDir: "desc",
          page: 1,
          ...filters,
          instrumentId:
            instrument === undefined
              ? undefined
              : instrumentIds.get(instrument),
        },
        tx,
      );
      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }

  if (result === null) throw new Error("Fixture never produced a result");
  return result;
}

describe("listJournalTrades — day values", () => {
  it("counts entries and missed setups per trade date on the page", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const { days } = await listFor({
      trades: [
        { tradeDate: "2026-10-20" },
        { tradeDate: "2026-10-20", taken: false },
        { tradeDate: "2026-10-19" },
      ],
    });

    expect(days).toEqual([
      { date: "2026-10-19", entryCount: 1, missedCount: 0 },
      { date: "2026-10-20", entryCount: 2, missedCount: 1 },
    ]);
  });

  it("counts the whole day when it runs past the page", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    // 26 entries on one day: 25 fill page 1, the 26th opens page 2.
    const busyDay = Array.from({ length: 26 }, () => ({
      tradeDate: "2026-10-20",
    }));
    const { rows, days } = await listFor({
      trades: [...busyDay, { tradeDate: "2026-10-19" }],
      filters: { page: 2 },
    });

    expect(rows.map((row) => row.tradeDate)).toEqual([
      "2026-10-20",
      "2026-10-19",
    ]);
    expect(days).toEqual([
      { date: "2026-10-19", entryCount: 1, missedCount: 0 },
      { date: "2026-10-20", entryCount: 26, missedCount: 0 },
    ]);
  });

  it("counts only the filtered instrument", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const { days } = await listFor({
      trades: [
        { tradeDate: "2026-10-20", instrument: "A" },
        { tradeDate: "2026-10-20", instrument: "B" },
        { tradeDate: "2026-10-20", instrument: "B", taken: false },
      ],
      filters: { instrument: "A" },
    });

    expect(days).toEqual([
      { date: "2026-10-20", entryCount: 1, missedCount: 0 },
    ]);
  });

  it("leaves a practice-only trade out of the combined view's count", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const { days } = await listFor({
      accounts: { Live: false, Sim: true },
      trades: [
        { tradeDate: "2026-10-20", on: ["Live"] },
        { tradeDate: "2026-10-20", on: ["Sim"] },
      ],
    });

    expect(days).toEqual([
      { date: "2026-10-20", entryCount: 1, missedCount: 0 },
    ]);
  });

  it("keeps a missed setup in the count while one account is selected", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const { days } = await listFor({
      accounts: { Live: false, Other: false },
      trades: [
        { tradeDate: "2026-10-20", on: ["Live"] },
        { tradeDate: "2026-10-20", on: ["Other"] },
        { tradeDate: "2026-10-20", taken: false },
      ],
      selected: "Live",
    });

    expect(days).toEqual([
      { date: "2026-10-20", entryCount: 2, missedCount: 1 },
    ]);
  });
});

describe("listJournalTrades — order within a day", () => {
  const oneDay: ListTrade[] = [
    { tradeDate: "2026-10-20", entryTime: "09:30", notes: "mid" },
    { tradeDate: "2026-10-20", entryTime: "14:05", notes: "late" },
    { tradeDate: "2026-10-20", entryTime: "08:15", notes: "early" },
  ];

  it("runs from the latest entry time down on a descending sort", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const { rows } = await listFor({ trades: oneDay });

    expect(rows.map((row) => row.notes)).toEqual(["late", "mid", "early"]);
  });

  it("runs from the earliest entry time up on an ascending sort", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const { rows } = await listFor({
      trades: oneDay,
      filters: { sortDir: "asc" },
    });

    expect(rows.map((row) => row.notes)).toEqual(["early", "mid", "late"]);
  });
});

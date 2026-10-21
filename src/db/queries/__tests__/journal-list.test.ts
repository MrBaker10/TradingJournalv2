import { sql, TransactionRollbackError } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../index.ts";
import { accounts } from "../../schema/accounts.ts";
import { instruments } from "../../schema/instruments.ts";
import { tradeAccounts, trades } from "../../schema/trades.ts";
import { users } from "../../schema/users.ts";
import { type DayTotals, getDayTotals } from "../dashboard.ts";
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
  /** Long from 100 at point value 50: the default 110 nets $500. */
  exitPrice?: string;
  /** No exit yet: a taken trade without a realised P&L. */
  open?: boolean;
  /** Commission per account name, in USD dollars, e.g. `{ Live: "3.00" }`. */
  commission?: Record<string, string>;
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

interface ListResult extends JournalTradesResult {
  /** The calendar's day totals for the same user and account selection. */
  calendar: DayTotals["days"];
}

async function listFor(fixture: ListFixture): Promise<ListResult> {
  let result: ListResult | null = null;

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
            exitTime: taken && !listTrade.open ? "15:00" : null,
            direction: "long",
            entryPrice: "100",
            exitPrice:
              taken && !listTrade.open ? (listTrade.exitPrice ?? "110") : null,
            notes: listTrade.notes ?? null,
          })
          .returning({ id: trades.id });

        for (const name of listTrade.on ?? (taken ? ["Live"] : [])) {
          const accountId = accountIds.get(name);
          if (accountId === undefined) {
            throw new Error(`Fixture account "${name}" was never created`);
          }
          const commission = listTrade.commission?.[name] ?? null;
          await tx.insert(tradeAccounts).values({
            tradeId: trade.id,
            accountId,
            commission,
            commissionSource: commission === null ? null : "file",
          });
        }
      }

      const selectedAccountId =
        fixture.selected === undefined
          ? null
          : (accountIds.get(fixture.selected) ?? null);
      const { instrument, ...filters } = fixture.filters ?? {};
      const listed = await listJournalTrades(
        {
          userId: user.id,
          selectedAccountId,
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
      const { days } = await getDayTotals(
        { userId: user.id, selectedAccountId },
        undefined,
        tx,
      );
      result = { ...listed, calendar: days };
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
      { date: "2026-10-19", entryCount: 1, missedCount: 0, amountCents: 50000 },
      { date: "2026-10-20", entryCount: 2, missedCount: 1, amountCents: 50000 },
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
    // The total is the whole day's too, not the one entry on this page.
    expect(days).toEqual([
      { date: "2026-10-19", entryCount: 1, missedCount: 0, amountCents: 50000 },
      {
        date: "2026-10-20",
        entryCount: 26,
        missedCount: 0,
        amountCents: 1300000,
      },
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
      { date: "2026-10-20", entryCount: 1, missedCount: 0, amountCents: 50000 },
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
      { date: "2026-10-20", entryCount: 1, missedCount: 0, amountCents: 50000 },
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
      { date: "2026-10-20", entryCount: 2, missedCount: 1, amountCents: 50000 },
    ]);
  });
});

describe("listJournalTrades — day total", () => {
  it("multiplies a copy trade by its real accounts, never by a practice one", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const { days } = await listFor({
      accounts: { Live: false, Eval: false, Sim: true },
      trades: [{ tradeDate: "2026-10-20", on: ["Live", "Eval", "Sim"] }],
    });

    expect(days[0]?.amountCents).toBe(100000);
  });

  it("shows a selected practice account's own day", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const { days } = await listFor({
      accounts: { Live: false, Sim: true },
      trades: [
        { tradeDate: "2026-10-20", on: ["Sim"], exitPrice: "96" },
        { tradeDate: "2026-10-20", on: ["Live"] },
      ],
      selected: "Sim",
    });

    expect(days).toEqual([
      {
        date: "2026-10-20",
        entryCount: 1,
        missedCount: 0,
        amountCents: -20000,
      },
    ]);
  });

  it("has no amount on a day with only missed setups", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const { days } = await listFor({
      trades: [{ tradeDate: "2026-10-20", taken: false }],
    });

    expect(days[0]?.amountCents).toBeNull();
  });

  it("is the calendar's day total for a selected account", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const { days, calendar } = await listFor({
      accounts: { Live: false, Eval: false },
      trades: [
        {
          tradeDate: "2026-10-20",
          on: ["Live", "Eval"],
          commission: { Live: "4.00", Eval: "6.00" },
        },
        { tradeDate: "2026-10-20", on: ["Eval"], exitPrice: "90" },
      ],
      selected: "Live",
    });

    expect(days.map((day) => day.amountCents)).toEqual(
      calendar.map((day) => day.amountCents),
    );
    // Live's own execution, unmultiplied, minus Live's commission only.
    expect(days[0]?.amountCents).toBe(49600);
  });

  it("is zero, as in the calendar, on a day whose trades have no exit yet", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const { days, calendar } = await listFor({
      trades: [
        { tradeDate: "2026-10-20", open: true },
        { tradeDate: "2026-10-20", taken: false },
      ],
    });

    expect(days[0]?.amountCents).toBe(0);
    expect(calendar[0]?.amountCents).toBe(0);
  });

  it("is the calendar's day total when no instrument is filtered", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const { days, calendar } = await listFor({
      accounts: { Live: false, Eval: false, Sim: true },
      trades: [
        {
          tradeDate: "2026-10-20",
          on: ["Live", "Eval", "Sim"],
          commission: { Live: "4.00", Eval: "4.00", Sim: "4.00" },
        },
        { tradeDate: "2026-10-20", on: ["Live"], exitPrice: "93" },
        { tradeDate: "2026-10-20", on: ["Sim"], exitPrice: "120" },
        { tradeDate: "2026-10-20", instrument: "B", on: ["Eval"] },
        { tradeDate: "2026-10-19", on: ["Live"], exitPrice: "98" },
      ],
    });

    expect(days.map((day) => [day.date, day.amountCents])).toEqual(
      calendar.map((day) => [day.date, day.amountCents]),
    );
    // Worked by hand: 2 × 500 − 2 × 4 (the practice account's commission
    // stays out) − 350 + 500 on the 20th, −100 on the 19th.
    expect(days.map((day) => day.amountCents)).toEqual([-10000, 114200]);
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

describe("listJournalTrades — counts for the filters", () => {
  it("splits the filtered entries into taken and missed across all pages", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const takenDays = Array.from({ length: 27 }, () => ({
      tradeDate: "2026-10-20",
    }));
    const { totalCount, takenCount, missedCount } = await listFor({
      trades: [
        ...takenDays,
        { tradeDate: "2026-10-19", taken: false },
        { tradeDate: "2026-10-18", taken: false },
        { tradeDate: "2026-10-18", instrument: "B" },
      ],
      filters: { page: 2, instrument: "A" },
    });

    expect({ totalCount, takenCount, missedCount }).toEqual({
      totalCount: 29,
      takenCount: 27,
      missedCount: 2,
    });
  });

  it("counts a missed setup while one account is selected", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const { totalCount, takenCount, missedCount } = await listFor({
      accounts: { Live: false, Other: false },
      trades: [
        { tradeDate: "2026-10-20", on: ["Live"] },
        { tradeDate: "2026-10-20", on: ["Other"] },
        { tradeDate: "2026-10-19", taken: false },
      ],
      selected: "Live",
    });

    expect({ totalCount, takenCount, missedCount }).toEqual({
      totalCount: 2,
      takenCount: 1,
      missedCount: 1,
    });
  });
});

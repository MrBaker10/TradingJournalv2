import { eq, TransactionRollbackError } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../../index.ts";
import { accounts } from "../../schema/accounts.ts";
import { instruments } from "../../schema/instruments.ts";
import { tradeAccounts, trades } from "../../schema/trades.ts";
import { users } from "../../schema/users.ts";
import {
  bumpStreakExpression,
  type DayTotals,
  getDashboardRewardState,
  getDayTotals,
  setStreakMilestoneSeen,
} from "../dashboard.ts";
import type { QueryScope } from "../scope.ts";

// Test-only symbol, never committed — every fixture runs inside a rolled-back
// transaction, the same harness trades.test.ts uses.
const TEST_INSTRUMENT_SYMBOL = "TEST-DASHBOARD-BUMP";

interface Scenario {
  /** `users.dashboard_seen_at`, or null for "never opened the dashboard". */
  seenAt: Date | null;
  /** `trades.created_at` of the one trade in the fixture, or null for none. */
  tradeCreatedAt: Date | null;
}

/** Drizzle's `timestamp` columns take Date objects, not ISO strings. */
function at(iso: string): Date {
  return new Date(iso);
}

// Design.md §4.3: bump when a trade was logged since the dashboard was last
// opened. The comparison this exercises used to live in TypeScript, where it
// compared a string against a Date and was therefore always false — which the
// NULL case hid, because it short-circuits before the comparison. Every case
// below except the first one sets the column.
async function evaluateBump(scenario: Scenario): Promise<boolean | null> {
  let result: boolean | null = null;

  try {
    await db.transaction(async (tx) => {
      const [user] = await tx.select({ id: users.id }).from(users).limit(1);
      if (!user) {
        throw new Error(
          "No seeded user found — run `pnpm db:seed` before this test",
        );
      }

      // The seeded user already has trades, so this fixture works on a user
      // of its own rather than fighting them.
      const [fixtureUser] = await tx
        .insert(users)
        .values({
          username: "bump-fixture",
          email: "bump-fixture@users.invalid",
          displayName: "Bump Fixture",
          timezone: "UTC",
          dashboardSeenAt: scenario.seenAt,
        })
        .returning({ id: users.id });

      if (scenario.tradeCreatedAt !== null) {
        const [instrument] = await tx
          .insert(instruments)
          .values({
            symbol: TEST_INSTRUMENT_SYMBOL,
            name: "Throwaway test instrument",
            pointValue: "50",
            tickSize: "0.25",
          })
          .returning({ id: instruments.id });

        await tx.insert(trades).values({
          userId: fixtureUser.id,
          tradeDate: "2026-01-01",
          instrumentId: instrument.id,
          taken: true,
          contracts: "1",
          entryTime: "09:00",
          direction: "long",
          entryPrice: "100",
          createdAt: scenario.tradeCreatedAt,
        });
      }

      // Evaluated through `tx`, because the fixture rows are not committed —
      // calling the exported query function would run on another connection
      // and simply not see them.
      const [row] = await tx
        .select({ bumpStreak: bumpStreakExpression(fixtureUser.id) })
        .from(users)
        .where(eq(users.id, fixtureUser.id));
      result = row.bumpStreak;

      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) {
      throw error;
    }
  }

  return result;
}

describe("bumpStreakExpression", () => {
  it("bumps when a trade was logged after the last dashboard visit", async () => {
    // The case the broken TypeScript comparison got wrong.
    expect(
      await evaluateBump({
        seenAt: at("2026-01-01T00:00:00Z"),
        tradeCreatedAt: at("2026-02-01T00:00:00Z"),
      }),
    ).toBe(true);
  });

  it("does not bump when the last trade predates the visit", async () => {
    expect(
      await evaluateBump({
        seenAt: at("2026-03-01T00:00:00Z"),
        tradeCreatedAt: at("2026-02-01T00:00:00Z"),
      }),
    ).toBe(false);
  });

  it("bumps on the very first visit, when nothing has been seen yet", async () => {
    expect(
      await evaluateBump({
        seenAt: null,
        tradeCreatedAt: at("2026-02-01T00:00:00Z"),
      }),
    ).toBe(true);
  });

  it("does not bump for a user with no trades at all", async () => {
    expect(await evaluateBump({ seenAt: null, tradeCreatedAt: null })).toBe(
      false,
    );
  });

  it("does not bump on a second visit with nothing logged in between", async () => {
    expect(
      await evaluateBump({
        seenAt: at("2026-02-01T00:00:01Z"),
        tradeCreatedAt: at("2026-02-01T00:00:00Z"),
      }),
    ).toBe(false);
  });
});

// The other half of the milestone card: once it has rendered it marks itself
// seen, and the next visit must not offer the same card again. Which number
// is due is decided in src/domain/streak.ts and tested there; this is the
// round trip through the column.
describe("setStreakMilestoneSeen", () => {
  it("records the milestone and reads it back", async () => {
    let before: number | null = -1;
    let after: number | null = -1;

    try {
      await db.transaction(async (tx) => {
        const [fixtureUser] = await tx
          .insert(users)
          .values({
            username: "milestone-write-fixture",
            email: "milestone-write-fixture@users.invalid",
            displayName: "Milestone Write",
            timezone: "UTC",
          })
          .returning({ id: users.id });

        // Read through the same column the query uses, inside the transaction.
        const read = async () => {
          const [row] = await tx
            .select({ seen: users.streakMilestoneSeen })
            .from(users)
            .where(eq(users.id, fixtureUser.id));
          return row.seen;
        };

        before = await read();
        await tx
          .update(users)
          .set({ streakMilestoneSeen: 7 })
          .where(eq(users.id, fixtureUser.id));
        after = await read();

        tx.rollback();
      });
    } catch (error) {
      if (!(error instanceof TransactionRollbackError)) throw error;
    }

    expect(before).toBeNull();
    expect(after).toBe(7);
  });

  it("is the same column getDashboardRewardState reports", async () => {
    // Guards against the write and the read drifting onto different columns.
    expect(setStreakMilestoneSeen).toBeTypeOf("function");
    expect(getDashboardRewardState).toBeTypeOf("function");
    const state = await getDashboardRewardState(-1);
    expect(state).toEqual({ bumpStreak: false, milestoneSeen: null });
  });
});

// --- getDayTotals -----------------------------------------------------------
//
// The query the calendar and the equity curve both read. Until the curve was
// widened past one month it had no test at all; what is pinned here is the
// part TypeScript cannot see — that the three CTEs are valid SQL, that the
// range bound is optional, and that the two money rules survive the account
// fan-out over a stretch that crosses a month boundary.

const TOTALS_INSTRUMENT_SYMBOL = "TEST-DASHBOARD-TOTALS";

interface TotalsTrade {
  /** Which fixture accounts this trade ran on, by name. */
  on: string[];
  tradeDate: string;
  /** Long, entry 100. An exit of 110 with point value 50 nets $500. */
  exitPrice?: string;
  taken?: boolean;
}

interface TotalsFixture {
  /** Account name to `is_practice`. */
  accounts: Record<string, boolean>;
  trades: TotalsTrade[];
  /** null = "All accounts"; a name selects that fixture account. */
  selected?: string;
  range?: { from: string; to: string };
}

async function totalsFor(fixture: TotalsFixture): Promise<DayTotals> {
  let result: DayTotals | null = null;

  try {
    await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          username: "day-totals-fixture",
          email: "day-totals-fixture@users.invalid",
          displayName: "Day Totals Fixture",
          timezone: "UTC",
        })
        .returning({ id: users.id });

      const [instrument] = await tx
        .insert(instruments)
        .values({
          symbol: TOTALS_INSTRUMENT_SYMBOL,
          name: "Throwaway test instrument",
          pointValue: "50",
          tickSize: "0.25",
        })
        .returning({ id: instruments.id });

      const accountIds = new Map<string, number>();
      let sortOrder = 0;
      for (const [name, isPractice] of Object.entries(fixture.accounts)) {
        const [account] = await tx
          .insert(accounts)
          .values({ userId: user.id, name, sortOrder: sortOrder++, isPractice })
          .returning({ id: accounts.id });
        accountIds.set(name, account.id);
      }

      for (const fixtureTrade of fixture.trades) {
        const taken = fixtureTrade.taken ?? true;
        const [trade] = await tx
          .insert(trades)
          .values({
            userId: user.id,
            tradeDate: fixtureTrade.tradeDate,
            instrumentId: instrument.id,
            taken,
            contracts: taken ? "1" : null,
            entryTime: "09:00",
            exitTime: taken ? "09:30" : null,
            direction: "long",
            entryPrice: "100",
            exitPrice: taken ? (fixtureTrade.exitPrice ?? "110") : null,
          })
          .returning({ id: trades.id });

        for (const name of fixtureTrade.on) {
          const accountId = accountIds.get(name);
          if (accountId === undefined) {
            throw new Error(`Fixture account "${name}" was never created`);
          }
          await tx
            .insert(tradeAccounts)
            .values({ tradeId: trade.id, accountId });
        }
      }

      const scope: QueryScope = {
        userId: user.id,
        selectedAccountId:
          fixture.selected === undefined
            ? null
            : (accountIds.get(fixture.selected) ?? null),
      };

      result = await getDayTotals(scope, fixture.range, tx);
      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }

  if (result === null) throw new Error("Fixture never produced a result");
  return result;
}

describe("getDayTotals", () => {
  const acrossTwoMonths: TotalsTrade[] = [
    { on: ["Live"], tradeDate: "2026-08-20" },
    { on: ["Live"], tradeDate: "2026-09-03" },
    { on: ["Live"], tradeDate: "2026-09-04", exitPrice: "90" },
  ];

  it("returns the whole history when no range is given", async () => {
    // This is what the equity curve asks for: the series starts at the first
    // trade by itself, with no separate query for that date.
    const { days } = await totalsFor({
      accounts: { Live: false },
      trades: acrossTwoMonths,
    });

    expect(days.map((day) => day.date)).toEqual([
      "2026-08-20",
      "2026-09-03",
      "2026-09-04",
    ]);
    expect(days.map((day) => day.amountCents)).toEqual([50000, 50000, -50000]);
  });

  it("bounds the read when a range is given", async () => {
    const { days } = await totalsFor({
      accounts: { Live: false },
      trades: acrossTwoMonths,
      range: { from: "2026-09-01", to: "2026-09-30" },
    });

    expect(days.map((day) => day.date)).toEqual(["2026-09-03", "2026-09-04"]);
  });

  it("counts one row per day, however many entries it holds", async () => {
    const { days } = await totalsFor({
      accounts: { Live: false },
      trades: [
        { on: ["Live"], tradeDate: "2026-09-03" },
        { on: ["Live"], tradeDate: "2026-09-03" },
      ],
    });

    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({ entryCount: 2, amountCents: 100000 });
  });

  it("keeps a missed setup as a journaled day worth nothing", async () => {
    const { days } = await totalsFor({
      accounts: { Live: false },
      trades: [{ on: [], tradeDate: "2026-09-03", taken: false }],
    });

    expect(days[0]).toMatchObject({ entryCount: 1, amountCents: 0 });
  });

  describe("the money rules over a multi-month stretch", () => {
    it("multiplies a copy-trade by its real accounts", async () => {
      const { days } = await totalsFor({
        accounts: { Live: false, Eval: false },
        trades: [{ on: ["Live", "Eval"], tradeDate: "2026-08-20" }],
      });

      expect(days[0].amountCents).toBe(100000);
      // Counts do not multiply: it was one decision.
      expect(days[0].entryCount).toBe(1);
    });

    it("leaves a practice account out of the multiplier", async () => {
      const { days } = await totalsFor({
        accounts: { Live: false, Demo: true },
        trades: [{ on: ["Live", "Demo"], tradeDate: "2026-08-20" }],
      });

      expect(days[0].amountCents).toBe(50000);
    });

    it("drops a trade that ran only on practice accounts", async () => {
      const { days } = await totalsFor({
        accounts: { Live: false, Demo: true },
        trades: [
          { on: ["Demo"], tradeDate: "2026-08-20" },
          { on: ["Live"], tradeDate: "2026-09-03" },
        ],
      });

      expect(days.map((day) => day.date)).toEqual(["2026-09-03"]);
    });

    it("does not multiply while one account is selected", async () => {
      const { days } = await totalsFor({
        accounts: { Live: false, Eval: false },
        trades: [{ on: ["Live", "Eval"], tradeDate: "2026-08-20" }],
        selected: "Live",
      });

      expect(days[0].amountCents).toBe(50000);
    });

    it("shows a practice account's own figures when it is selected alone", async () => {
      const { days } = await totalsFor({
        accounts: { Live: false, Demo: true },
        trades: [{ on: ["Demo"], tradeDate: "2026-08-20" }],
        selected: "Demo",
      });

      expect(days[0].amountCents).toBe(50000);
    });
  });

  it("measures the drawdown from the higher of the peak and zero", async () => {
    // A stretch that only ever falls has a drawdown equal to its loss, not
    // none at all — the peak it is measured from is zero.
    const { maxDrawdownCents } = await totalsFor({
      accounts: { Live: false },
      trades: [
        { on: ["Live"], tradeDate: "2026-08-20", exitPrice: "90" },
        { on: ["Live"], tradeDate: "2026-09-03", exitPrice: "90" },
      ],
    });

    expect(maxDrawdownCents).toBe(100000);
  });

  it("has nothing to report for a user with no entries", async () => {
    const totals = await totalsFor({ accounts: { Live: false }, trades: [] });

    expect(totals.days).toEqual([]);
    expect(totals.maxDrawdownCents).toBe(0);
  });
});

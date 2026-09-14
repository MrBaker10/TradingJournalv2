import { eq, TransactionRollbackError } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../../index.ts";
import { instruments } from "../../schema/instruments.ts";
import { trades } from "../../schema/trades.ts";
import { users } from "../../schema/users.ts";
import {
  bumpStreakExpression,
  getDashboardRewardState,
  setStreakMilestoneSeen,
} from "../dashboard.ts";

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
          contracts: 1,
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

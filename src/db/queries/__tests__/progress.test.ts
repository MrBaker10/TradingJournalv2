import { TransactionRollbackError } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../../index.ts";
import { accounts } from "../../schema/accounts.ts";
import { badgeDefs, userBadges } from "../../schema/badges.ts";
import { dailyNotes } from "../../schema/daily-notes.ts";
import { instruments } from "../../schema/instruments.ts";
import { monthlyScores } from "../../schema/monthly-scores.ts";
import { tradeAccounts, trades } from "../../schema/trades.ts";
import { users } from "../../schema/users.ts";
import { weeklyReviews } from "../../schema/weekly-reviews.ts";
import { getProgressCounters, hasProgressMoment } from "../progress.ts";

// Drives the progress queries against real Postgres, inside a rolled-back
// transaction like the other query tests. Test-only symbol, never committed.
const TEST_INSTRUMENT_SYMBOL = "TEST-PROGRESS";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface Fixture {
  tx: Tx;
  userId: number;
  otherUserId: number;
  /** One real and one practice account of the user, one of the other user. */
  accountIds: { real: number; practice: number; other: number };
  /** Inserts one entry; `accountIds` empty makes it a missed setup. */
  addEntry: (entry: {
    userId: number;
    accountIds: number[];
    byTheBook?: boolean;
    createdAt?: Date;
  }) => Promise<void>;
}

async function fixture(
  body: (fixture: Fixture) => Promise<void>,
  options: { badgesSeenAt?: Date | null } = {},
) {
  try {
    await db.transaction(async (tx) => {
      const [user, other] = await tx
        .insert(users)
        .values([
          {
            username: "progress-test",
            email: "progress-test@users.invalid",
            displayName: "Progress test",
            timezone: "UTC",
            badgesSeenAt: options.badgesSeenAt ?? null,
          },
          {
            username: "progress-test-other",
            email: "progress-test-other@users.invalid",
            displayName: "Progress test other",
            timezone: "UTC",
          },
        ])
        .returning({ id: users.id });

      const [instrument] = await tx
        .insert(instruments)
        .values({
          symbol: TEST_INSTRUMENT_SYMBOL,
          name: "Throwaway test instrument",
          pointValue: "50",
          tickSize: "0.25",
        })
        .returning({ id: instruments.id });

      const [real, practice, otherAccount] = await tx
        .insert(accounts)
        .values([
          { userId: user.id, name: "Real", sortOrder: 0, currency: "USD" },
          {
            userId: user.id,
            name: "Practice",
            sortOrder: 1,
            currency: "USD",
            isPractice: true,
          },
          { userId: other.id, name: "Other", sortOrder: 0, currency: "USD" },
        ])
        .returning({ id: accounts.id });

      const addEntry: Fixture["addEntry"] = async (entry) => {
        const taken = entry.accountIds.length > 0;
        const [trade] = await tx
          .insert(trades)
          .values({
            userId: entry.userId,
            tradeDate: "2026-10-20",
            instrumentId: instrument.id,
            taken,
            contracts: taken ? "1" : null,
            entryTime: "09:30",
            direction: "long",
            entryPrice: "100",
            byTheBook: entry.byTheBook ?? null,
            ...(entry.createdAt ? { createdAt: entry.createdAt } : {}),
          })
          .returning({ id: trades.id });
        if (taken) {
          await tx.insert(tradeAccounts).values(
            entry.accountIds.map((accountId) => ({
              tradeId: trade.id,
              accountId,
            })),
          );
        }
      };

      await body({
        tx,
        userId: user.id,
        otherUserId: other.id,
        accountIds: {
          real: real.id,
          practice: practice.id,
          other: otherAccount.id,
        },
        addEntry,
      });
      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }
}

const WEEKS = { from: "2026-09-06", to: "2026-10-25" };

describe("getProgressCounters", () => {
  it("is all zero for a user who has logged nothing", async () => {
    await fixture(async ({ tx, userId }) => {
      expect(await getProgressCounters(userId, WEEKS, tx)).toEqual({
        entriesLogged: 0,
        reviewsWritten: 0,
        byTheBookTrades: 0,
        bestMonthlyScore: 0,
        reviewedWeeks: [],
      });
    });
  });

  it("counts entries once however many real accounts carry them", async () => {
    await fixture(async ({ tx, userId, accountIds, addEntry }) => {
      await addEntry({
        userId,
        accountIds: [accountIds.real],
        byTheBook: true,
      });
      await addEntry({
        userId,
        accountIds: [accountIds.real, accountIds.practice],
        byTheBook: true,
      });
      await addEntry({ userId, accountIds: [accountIds.real] });

      const counters = await getProgressCounters(userId, WEEKS, tx);
      expect(counters.entriesLogged).toBe(3);
      expect(counters.byTheBookTrades).toBe(2);
    });
  });

  // Process figures see real accounts only, whatever the selector says; a
  // missed setup carries no account and counts as an entry, never as a
  // by-the-book trade.
  it("leaves practice-only trades out and counts missed setups", async () => {
    await fixture(async ({ tx, userId, accountIds, addEntry }) => {
      await addEntry({
        userId,
        accountIds: [accountIds.practice],
        byTheBook: true,
      });
      await addEntry({ userId, accountIds: [], byTheBook: true });

      const counters = await getProgressCounters(userId, WEEKS, tx);
      expect(counters.entriesLogged).toBe(1);
      expect(counters.byTheBookTrades).toBe(0);
    });
  });

  it("counts written end-of-day reviews only", async () => {
    await fixture(async ({ tx, userId }) => {
      await tx.insert(dailyNotes).values([
        { userId, noteDate: "2026-10-19", eodReview: "Waited for the open" },
        { userId, noteDate: "2026-10-20", premarketPlan: "Plan only" },
        { userId, noteDate: "2026-10-21", eodReview: "" },
      ]);

      expect(
        (await getProgressCounters(userId, WEEKS, tx)).reviewsWritten,
      ).toBe(1);
    });
  });

  it("takes the best frozen month", async () => {
    await fixture(async ({ tx, userId }) => {
      const parts = {
        showingUp: "30",
        completeness: "15",
        planAdherence: "20",
        reviewHabit: "10",
      };
      await tx.insert(monthlyScores).values([
        { userId, month: "2026-08", score: 84, ...parts },
        { userId, month: "2026-09", score: 71, ...parts },
      ]);

      expect(
        (await getProgressCounters(userId, WEEKS, tx)).bestMonthlyScore,
      ).toBe(84);
    });
  });

  it("lists the reviewed weeks in the window, oldest first", async () => {
    await fixture(async ({ tx, userId }) => {
      await tx.insert(weeklyReviews).values([
        { userId, weekStart: "2026-08-30", whatWorked: "Before the window" },
        { userId, weekStart: "2026-10-18", whatWorked: "Patience" },
        { userId, weekStart: "2026-09-13", focusNextWeek: "Size down" },
        { userId, weekStart: "2026-10-04" },
      ]);

      expect(
        (await getProgressCounters(userId, WEEKS, tx)).reviewedWeeks,
      ).toEqual(["2026-09-13", "2026-10-18"]);
    });
  });

  it("never counts another user's rows", async () => {
    await fixture(async ({ tx, userId, otherUserId, accountIds, addEntry }) => {
      await addEntry({
        userId: otherUserId,
        accountIds: [accountIds.other],
        byTheBook: true,
      });
      await tx.insert(dailyNotes).values({
        userId: otherUserId,
        noteDate: "2026-10-19",
        eodReview: "Someone else's day",
      });
      await tx.insert(monthlyScores).values({
        userId: otherUserId,
        month: "2026-09",
        score: 95,
        showingUp: "40",
        completeness: "20",
        planAdherence: "25",
        reviewHabit: "10",
      });
      await tx.insert(weeklyReviews).values({
        userId: otherUserId,
        weekStart: "2026-10-18",
        whatWorked: "Someone else's week",
      });

      expect(await getProgressCounters(userId, WEEKS, tx)).toEqual({
        entriesLogged: 0,
        reviewsWritten: 0,
        byTheBookTrades: 0,
        bestMonthlyScore: 0,
        reviewedWeeks: [],
      });
    });
  });
});

describe("hasProgressMoment", () => {
  const seenAt = new Date("2026-10-20T12:00:00Z");
  const before = new Date("2026-10-20T08:00:00Z");
  const after = new Date("2026-10-21T08:00:00Z");

  async function earnBadge(tx: Tx, userId: number, earnedAt: Date) {
    const [badge] = await tx
      .select({ id: badgeDefs.id })
      .from(badgeDefs)
      .limit(1);
    if (!badge) {
      throw new Error("No badge definitions — run `pnpm db:seed` first");
    }
    await tx
      .insert(userBadges)
      .values({ userId, badgeDefId: badge.id, earnedAt });
  }

  it("is due when an entry was logged since Progress was last seen", async () => {
    await fixture(
      async ({ tx, userId, addEntry }) => {
        await addEntry({ userId, accountIds: [], createdAt: after });
        expect(await hasProgressMoment(userId, tx)).toBe(true);
      },
      { badgesSeenAt: seenAt },
    );
  });

  it("is due when a badge was earned since Progress was last seen", async () => {
    await fixture(
      async ({ tx, userId }) => {
        await earnBadge(tx, userId, after);
        expect(await hasProgressMoment(userId, tx)).toBe(true);
      },
      { badgesSeenAt: seenAt },
    );
  });

  it("is not due when everything predates the last visit", async () => {
    await fixture(
      async ({ tx, userId, addEntry }) => {
        await addEntry({ userId, accountIds: [], createdAt: before });
        await earnBadge(tx, userId, before);
        expect(await hasProgressMoment(userId, tx)).toBe(false);
      },
      { badgesSeenAt: seenAt },
    );
  });

  it("is due on the first visit once something was logged", async () => {
    await fixture(async ({ tx, userId, addEntry }) => {
      expect(await hasProgressMoment(userId, tx)).toBe(false);
      await addEntry({ userId, accountIds: [], createdAt: before });
      expect(await hasProgressMoment(userId, tx)).toBe(true);
    });
  });

  // Practice: excluded from all combined figures, including progress
  // (AGENTS.md). A trade only on a practice account extends no streak.
  it("ignores a trade that is only on a practice account", async () => {
    await fixture(
      async ({ tx, userId, accountIds, addEntry }) => {
        await addEntry({
          userId,
          accountIds: [accountIds.practice],
          createdAt: after,
        });
        expect(await hasProgressMoment(userId, tx)).toBe(false);
        await addEntry({
          userId,
          accountIds: [accountIds.real, accountIds.practice],
          createdAt: after,
        });
        expect(await hasProgressMoment(userId, tx)).toBe(true);
      },
      { badgesSeenAt: seenAt },
    );
  });

  it("ignores another user's entries", async () => {
    await fixture(
      async ({ tx, userId, otherUserId, accountIds, addEntry }) => {
        await addEntry({
          userId: otherUserId,
          accountIds: [accountIds.other],
          createdAt: after,
        });
        expect(await hasProgressMoment(userId, tx)).toBe(false);
      },
      { badgesSeenAt: seenAt },
    );
  });
});

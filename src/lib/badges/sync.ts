import { insertEarnedBadges, listUserBadges } from "../../db/queries/badges.ts";
import {
  getBadgeCounters,
  getMonthScoreDays,
  getStreakEntryDays,
} from "../../db/queries/dashboard.ts";
import { badgesToAward } from "../../domain/badges.ts";
import { calculateConsistencyScore } from "../../domain/consistency.ts";
import { calculateStreak } from "../../domain/streak.ts";
import { monthKeyOf, todayInTimeZone } from "../time.ts";

/**
 * Gives the user every badge their numbers have earned and that they do not
 * hold yet, and returns the keys that were newly written.
 *
 * Runs in the write paths (`createTrade`, `saveDailyNote`), never while a page
 * renders: awarding is a permanent write, and a GET must not have side
 * effects. The caller runs it *after* its own write has succeeded and ignores
 * a failure here — a badge that arrives one trade late is a small thing, a
 * trade lost to a badge error is not.
 *
 * Streak, score and badge counters all see real accounts only; the queries
 * below take no selected account, because "streak, consistency score and
 * badges see real accounts only" (project-structure.md) is a product rule and
 * not a view option.
 */
export async function syncUserBadges(
  userId: number,
  timeZone: string,
): Promise<string[]> {
  const today = todayInTimeZone(timeZone);
  const month = monthKeyOf(today);

  const [streakDays, scoreDays, counters, alreadyEarned] = await Promise.all([
    getStreakEntryDays(userId),
    getMonthScoreDays(userId, month),
    getBadgeCounters(userId),
    listUserBadges(userId),
  ]);

  const streak = calculateStreak(streakDays, today, timeZone);
  const score = calculateConsistencyScore(scoreDays, month, today);

  const keys = badgesToAward(
    {
      entriesLogged: counters.entriesLogged,
      reviewsWritten: counters.reviewsWritten,
      loggedTradingDays: streakDays.map((day) => day.tradeDate),
      longestStreak: streak.longest,
      byTheBookTrades: counters.byTheBookTrades,
      bestMonthlyScore: score.score,
    },
    alreadyEarned.map((badge) => badge.key),
  );

  return insertEarnedBadges(userId, keys);
}

/**
 * The shape the write paths use: awards what is due, and swallows a failure
 * rather than letting it reach the user. The trade or the note is already
 * saved at this point — reporting "couldn't save" because a badge row failed
 * would be a lie, and losing the write to roll it back would be worse.
 */
export async function awardBadgesQuietly(
  userId: number,
  timeZone: string,
): Promise<void> {
  try {
    await syncUserBadges(userId, timeZone);
  } catch (error) {
    console.error("Could not sync badges", error);
  }
}

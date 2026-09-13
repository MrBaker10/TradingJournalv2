import { TZDate } from "@date-fns/tz";
import { format, getDay, startOfWeek } from "date-fns";
import type { IsoDate } from "./streak.ts";

// Twelve badges in four categories (project-overview.md §G). All of them are
// earned by journaling — never by P&L, win rate or R, and never ranked
// against anyone.
//
// Contract:
//
// - The counters must already be filtered to the current user's real
//   accounts.
// - They count entries, not trade rows. A trade assigned to three accounts is
//   one entry; the caller groups before counting, or a join over
//   trade_accounts silently triples every volume badge.
// - Dates are the user's own calendar (`users.timezone`), never UTC and never
//   the server's zone.
//
// This module reads no database and awards nothing; it answers which badges
// the numbers satisfy. Writing `user_badges` belongs elsewhere.

export type BadgeCategory = "Getting started" | "Volume" | "Streaks" | "Craft";

export interface BadgeDefinition {
  /** Stable identifier, also the natural key of `badge_defs`. */
  key: string;
  category: BadgeCategory;
  title: string;
  description: string;
}

export interface BadgeProgress {
  /** Trades and missed setups, backfills included. */
  entriesLogged: number;
  reviewsWritten: number;
  /**
   * Distinct trading days with at least one entry, for the full-week badge —
   * `group by trade_date`, not one row per trade.
   */
  loggedTradingDays: IsoDate[];
  /** Streak days only, so a backfill can never unlock these. */
  longestStreak: number;
  byTheBookTrades: number;
  /** The best monthly consistency score reached so far. */
  bestMonthlyScore: number;
}

export const BADGE_DEFINITIONS: readonly BadgeDefinition[] = [
  {
    key: "first_entry",
    category: "Getting started",
    title: "First Entry",
    description: "Log your first trade or missed setup.",
  },
  {
    key: "first_review",
    category: "Getting started",
    title: "First Review",
    description: "Write your first end-of-day review.",
  },
  {
    key: "full_week",
    category: "Getting started",
    title: "Full Week",
    description: "Log every trading day of one week.",
  },
  {
    key: "logged_10",
    category: "Volume",
    title: "Getting Going",
    description: "Log 10 entries.",
  },
  {
    key: "logged_50",
    category: "Volume",
    title: "Regular",
    description: "Log 50 entries.",
  },
  {
    key: "logged_250",
    category: "Volume",
    title: "Dedicated",
    description: "Log 250 entries.",
  },
  {
    key: "logged_1000",
    category: "Volume",
    title: "Archivist",
    description: "Log 1000 entries.",
  },
  {
    key: "streak_7",
    category: "Streaks",
    title: "Week Streak",
    description: "Reach a logging streak of 7 days.",
  },
  {
    key: "streak_30",
    category: "Streaks",
    title: "Month Streak",
    description: "Reach a logging streak of 30 days.",
  },
  {
    key: "streak_100",
    category: "Streaks",
    title: "Century Streak",
    description: "Reach a logging streak of 100 days.",
  },
  {
    key: "by_the_book_20",
    category: "Craft",
    title: "By the Book",
    description: "Log 20 trades that followed your plan.",
  },
  {
    key: "score_90",
    category: "Craft",
    title: "Dialled In",
    description: "Finish a month with a consistency score of 90 or more.",
  },
];

const TRADING_DAYS_PER_WEEK = 5;

/** True once one Monday-to-Friday week is logged in full. */
export function hasFullLoggedWeek(loggedTradingDays: IsoDate[]): boolean {
  const weekdaysPerWeek = new Map<string, Set<number>>();

  for (const date of loggedTradingDays) {
    const day = new TZDate(`${date}T00:00:00Z`, "UTC");
    const weekday = getDay(day);
    if (weekday < 1 || weekday > 5) continue;

    const week = format(startOfWeek(day, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const weekdays = weekdaysPerWeek.get(week) ?? new Set<number>();
    weekdays.add(weekday);
    weekdaysPerWeek.set(week, weekdays);
  }

  for (const weekdays of weekdaysPerWeek.values()) {
    if (weekdays.size === TRADING_DAYS_PER_WEEK) return true;
  }
  return false;
}

const CRITERIA: Record<string, (progress: BadgeProgress) => boolean> = {
  first_entry: (progress) => progress.entriesLogged >= 1,
  first_review: (progress) => progress.reviewsWritten >= 1,
  full_week: (progress) => hasFullLoggedWeek(progress.loggedTradingDays),
  logged_10: (progress) => progress.entriesLogged >= 10,
  logged_50: (progress) => progress.entriesLogged >= 50,
  logged_250: (progress) => progress.entriesLogged >= 250,
  logged_1000: (progress) => progress.entriesLogged >= 1000,
  streak_7: (progress) => progress.longestStreak >= 7,
  streak_30: (progress) => progress.longestStreak >= 30,
  streak_100: (progress) => progress.longestStreak >= 100,
  by_the_book_20: (progress) => progress.byTheBookTrades >= 20,
  score_90: (progress) => progress.bestMonthlyScore >= 90,
};

/** The badges these numbers satisfy, in definition order. */
export function earnedBadges(progress: BadgeProgress): BadgeDefinition[] {
  return BADGE_DEFINITIONS.filter((badge) => CRITERIA[badge.key](progress));
}

/**
 * Badges that are visible and explained but never written yet, because the
 * number their criterion asks for does not exist in a trustworthy form.
 *
 * `score_90` says "finish a month". Until `monthly_scores` and the month-close
 * job exist, the only value available is the running month's score, and that
 * can still fall. A badge written from it would be permanent and wrong, so it
 * stays open and says why.
 */
export const DEFERRED_BADGE_KEYS: readonly string[] = ["score_90"];

/**
 * Which badge keys to write for a user right now: earned by the numbers, not
 * already on the user, not deferred.
 *
 * Awarding is a one-way door — a row in `user_badges` is never removed — so
 * this is deliberately separate from `earnedBadges`, which answers the looser
 * question of what the numbers currently satisfy.
 */
export function badgesToAward(
  progress: BadgeProgress,
  alreadyEarnedKeys: readonly string[],
): string[] {
  const already = new Set(alreadyEarnedKeys);
  return earnedBadges(progress)
    .map((badge) => badge.key)
    .filter((key) => !already.has(key) && !DEFERRED_BADGE_KEYS.includes(key));
}

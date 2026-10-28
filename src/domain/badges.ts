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

type CountedProgress = Exclude<keyof BadgeProgress, "loggedTradingDays">;

/**
 * The badges earned by reaching a number. One table for awarding and for the
 * progress shown on /progress, so the two can never name different targets.
 */
const THRESHOLDS: Record<string, { counter: CountedProgress; target: number }> =
  {
    first_entry: { counter: "entriesLogged", target: 1 },
    first_review: { counter: "reviewsWritten", target: 1 },
    logged_10: { counter: "entriesLogged", target: 10 },
    logged_50: { counter: "entriesLogged", target: 50 },
    logged_250: { counter: "entriesLogged", target: 250 },
    logged_1000: { counter: "entriesLogged", target: 1000 },
    streak_7: { counter: "longestStreak", target: 7 },
    streak_30: { counter: "longestStreak", target: 30 },
    streak_100: { counter: "longestStreak", target: 100 },
    by_the_book_20: { counter: "byTheBookTrades", target: 20 },
    score_90: { counter: "bestMonthlyScore", target: 90 },
  };

function meetsThreshold(key: string, progress: BadgeProgress): boolean {
  const threshold = THRESHOLDS[key];
  return progress[threshold.counter] >= threshold.target;
}

const CRITERIA: Record<string, (progress: BadgeProgress) => boolean> = {
  ...Object.fromEntries(
    Object.keys(THRESHOLDS).map((key) => [
      key,
      (progress: BadgeProgress) => meetsThreshold(key, progress),
    ]),
  ),
  full_week: (progress) => hasFullLoggedWeek(progress.loggedTradingDays),
};

/** The badges these numbers satisfy, in definition order. */
export function earnedBadges(progress: BadgeProgress): BadgeDefinition[] {
  return BADGE_DEFINITIONS.filter((badge) => CRITERIA[badge.key](progress));
}

/**
 * Badges whose criterion is a finished month, so they can only arrive after
 * the month-close job has frozen one into `monthly_scores`. The hint on
 * /progress says so; awarding them is no different from any other badge.
 *
 * `bestMonthlyScore` is read from the frozen months only, never from the
 * running month — that one can still fall, and a badge written from it would
 * be permanent and wrong.
 */
export const MONTH_END_BADGE_KEYS: readonly string[] = ["score_90"];

/**
 * Which badge keys to write for a user right now: earned by the numbers and
 * not already on the user.
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
    .filter((key) => !already.has(key));
}

/**
 * How far the numbers are towards a badge's threshold, capped at the target.
 * Null for a badge that is not a count (the full week).
 */
export function badgeProgressOf(
  key: string,
  progress: BadgeProgress,
): { value: number; target: number } | null {
  const threshold = THRESHOLDS[key];
  if (threshold === undefined) return null;
  return {
    value: Math.min(progress[threshold.counter], threshold.target),
    target: threshold.target,
  };
}

const NEXT_UP_COUNT = 3;

/**
 * The keys of the unearned badges closest to their threshold, closest first;
 * equally close ones keep definition order. "Closest" is the share of the
 * target reached, so 19/20 comes before 132/250.
 */
export function nextUpBadges(
  progress: BadgeProgress,
  earnedKeys: readonly string[],
): string[] {
  const earned = new Set(earnedKeys);
  return BADGE_DEFINITIONS.flatMap((badge) => {
    const reached = badgeProgressOf(badge.key, progress);
    if (earned.has(badge.key) || reached === null) return [];
    return [{ key: badge.key, share: reached.value / reached.target }];
  })
    .sort((a, b) => b.share - a.share)
    .slice(0, NEXT_UP_COUNT)
    .map((badge) => badge.key);
}

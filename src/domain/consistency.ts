import { TZDate } from "@date-fns/tz";
import { addDays, format, lastDayOfMonth } from "date-fns";
import { type IsoDate, isTradingDay, toTradingDay } from "./streak.ts";

// Consistency score, verbatim from project-structure.md ("Rules the code must
// honour"):
//
//   Monthly, out of 100: showing up 40, journaling completeness 20, plan
//   adherence 25, review habit 15. Entries are averaged per day first, so
//   twenty trades in one day count exactly as much as one. P&L, win rate and
//   R affect nothing here.
//
// Contract:
//
// - `days` must already be filtered to the current user's real accounts, and
//   holds one item per calendar date that carries at least one entry.
// - Entries are counted, not trade rows. A trade assigned to three accounts
//   is one entry; the caller groups before counting, or a join over
//   trade_accounts silently triples every share computed here.
// - `month` and `today` are the user's own calendar (`users.timezone`), never
//   UTC and never the server's zone. The module has no DB access and no
//   clock beyond `today`.

export const SCORE_WEIGHTS = {
  showingUp: 40,
  completeness: 20,
  planAdherence: 25,
  reviewHabit: 15,
} as const;

export interface ScoreEntry {
  /** false = missed setup. Counts for completeness, never for adherence. */
  taken: boolean;
  hasNotes: boolean;
  hasGrade: boolean;
  hasFelt: boolean;
  hasConfluence: boolean;
  hasScreenshotOrLink: boolean;
  byTheBook: boolean;
}

export interface ScoreDay {
  date: IsoDate;
  entries: ScoreEntry[];
  /** `daily_notes.eod_review` for that date, once the table exists. */
  hasEodReview: boolean;
}

export interface ConsistencyScore {
  /** The four parts summed exactly, then rounded to a whole number. */
  score: number;
  /** The parts themselves stay exact, for `monthly_scores` and the UI. */
  showingUp: number;
  completeness: number;
  planAdherence: number;
  reviewHabit: number;
}

interface DayGroup {
  entries: ScoreEntry[];
  hasEodReview: boolean;
}

/** A `YYYY-MM` month key, matching `monthly_scores.month`. */
type MonthKey = string;

function isoOf(day: TZDate): IsoDate {
  return format(day, "yyyy-MM-dd");
}

/**
 * The trading days of `month` up to and including `today`. In a month that is
 * over this is every trading day it has; in the running month it is only the
 * days the user has actually had, so the score reads correctly from day one.
 */
export function tradingDaysElapsed(month: MonthKey, today: IsoDate): IsoDate[] {
  const firstOfMonth = new TZDate(`${month}-01T00:00:00Z`, "UTC");
  const lastOfMonth = isoOf(lastDayOfMonth(firstOfMonth));
  const end = today < lastOfMonth ? today : lastOfMonth;

  const days: IsoDate[] = [];
  let cursor = firstOfMonth;
  while (isoOf(cursor) <= end) {
    const date = isoOf(cursor);
    if (isTradingDay(date)) days.push(date);
    cursor = addDays(cursor, 1);
  }
  return days;
}

// Sunday belongs to the following Monday and Saturday to no trading day at
// all, exactly as in the streak. Two source dates can therefore land on the
// same trading day, so their entries and reviews merge.
function groupByTradingDay(
  days: ScoreDay[],
  month: MonthKey,
  today: IsoDate,
): Map<IsoDate, DayGroup> {
  const groups = new Map<IsoDate, DayGroup>();
  for (const day of days) {
    if (day.entries.length === 0) continue;
    const tradingDay = toTradingDay(day.date);
    if (tradingDay === null) continue;
    if (tradingDay.slice(0, 7) !== month) continue;
    // A Sunday entry can fold onto a Monday that has not arrived yet. It is
    // not part of the elapsed days, so it cannot count towards them either.
    if (tradingDay > today) continue;

    const group = groups.get(tradingDay);
    if (group) {
      group.entries.push(...day.entries);
      group.hasEodReview = group.hasEodReview || day.hasEodReview;
    } else {
      groups.set(tradingDay, {
        entries: [...day.entries],
        hasEodReview: day.hasEodReview,
      });
    }
  }
  return groups;
}

function isComplete(entry: ScoreEntry): boolean {
  return (
    entry.hasNotes &&
    entry.hasGrade &&
    entry.hasFelt &&
    entry.hasConfluence &&
    entry.hasScreenshotOrLink
  );
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function calculateConsistencyScore(
  days: ScoreDay[],
  month: MonthKey,
  today: IsoDate,
): ConsistencyScore {
  const groups = groupByTradingDay(days, month, today);
  const elapsed = tradingDaysElapsed(month, today);

  const showingUp =
    elapsed.length === 0
      ? 0
      : (groups.size / elapsed.length) * SCORE_WEIGHTS.showingUp;

  const completeness =
    mean(
      [...groups.values()].map(
        (group) =>
          group.entries.filter(isComplete).length / group.entries.length,
      ),
    ) * SCORE_WEIGHTS.completeness;

  // Days without a single taken trade drop out of the average rather than
  // scoring zero — logging missed setups must never cost points. A month with
  // no taken trade at all has no adherence to measure and keeps the full
  // weight; a month with nothing logged scores nothing.
  const adherencePerDay = [...groups.values()]
    .map((group) => group.entries.filter((entry) => entry.taken))
    .filter((taken) => taken.length > 0)
    .map(
      (taken) => taken.filter((entry) => entry.byTheBook).length / taken.length,
    );
  let planAdherence: number = SCORE_WEIGHTS.planAdherence;
  if (adherencePerDay.length > 0) {
    planAdherence = mean(adherencePerDay) * SCORE_WEIGHTS.planAdherence;
  } else if (groups.size === 0) {
    planAdherence = 0;
  }

  const reviewHabit =
    mean([...groups.values()].map((group) => (group.hasEodReview ? 1 : 0))) *
    SCORE_WEIGHTS.reviewHabit;

  return {
    score: Math.round(showingUp + completeness + planAdherence + reviewHabit),
    showingUp,
    completeness,
    planAdherence,
    reviewHabit,
  };
}

import { TZDate } from "@date-fns/tz";
import { format, lastDayOfMonth } from "date-fns";
import type { IsoDate } from "../domain/streak.ts";

// The user's timezone (`users.timezone`) decides every calendar boundary:
// what "today" and "this month" mean for streak, consistency score and badges
// (coding-standards.md, Time). The S7 domain modules take both as arguments
// and own no clock, so this is where the clock meets the zone — announced as
// the open item in decisions.md, S7.
//
// `entry_time` / `exit_time` never pass through here. They are the user's
// chart clock and stay unconverted.

/** A `YYYY-MM` month key, matching `monthly_scores.month`. */
export type MonthKey = string;

/**
 * The current calendar date in `timeZone`, not in UTC and not in the server's
 * zone. A trade logged at 01:30 in Berlin belongs to the Berlin day, which is
 * already the next date in UTC terms.
 *
 * The instant is an argument so a test can pin it; production passes none.
 */
export function todayInTimeZone(
  timeZone: string,
  now: Date = new Date(),
): IsoDate {
  return format(new TZDate(now, timeZone), "yyyy-MM-dd");
}

/** The month a date belongs to. Pure string work — a date has no zone. */
export function monthKeyOf(date: IsoDate): MonthKey {
  return date.slice(0, 7);
}

/**
 * A date as "Sep 3", the context line Design.md §4.7 puts under Best day and
 * Worst day. UTC-anchored for the same reason as monthRangeOf: the string is
 * a calendar date, and reading it in the machine's zone would shift the day.
 */
export function formatDayLabel(date: IsoDate): string {
  return format(new TZDate(`${date}T00:00:00Z`, "UTC"), "MMM d");
}

/**
 * First and last date of `month`, inclusive — the bounds every month-scoped
 * query filters `trade_date` against. UTC-anchored, because a date without a
 * time has no zone; the zone was already applied when `month` was derived.
 */
export function monthRangeOf(month: MonthKey): { from: IsoDate; to: IsoDate } {
  const firstOfMonth = new TZDate(`${month}-01T00:00:00Z`, "UTC");
  return {
    from: format(firstOfMonth, "yyyy-MM-dd"),
    to: format(lastDayOfMonth(firstOfMonth), "yyyy-MM-dd"),
  };
}

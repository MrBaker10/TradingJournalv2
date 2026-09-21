import { TZDate } from "@date-fns/tz";
import { format, lastDayOfMonth, subDays } from "date-fns";
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
  return calendarDateOf(now, timeZone);
}

/**
 * The calendar date an instant falls on, read in the user's zone.
 *
 * For an audit column like `created_at`, which is a `timestamptz` and
 * therefore a point in time rather than a date. Which day that point belongs
 * to is a question only a zone can answer, and the zone is the user's —
 * reading it in the machine's would move an entry made late in the evening to
 * the wrong day.
 */
export function calendarDateOf(instant: Date, timeZone: string): IsoDate {
  return format(new TZDate(instant, timeZone), "yyyy-MM-dd");
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
 * A month as "September 2026", the header line beside a month-scoped card.
 * UTC-anchored like `formatDayLabel`, and for the same reason.
 */
export function formatMonthLabel(month: MonthKey): string {
  return format(new TZDate(`${month}-01T00:00:00Z`, "UTC"), "MMMM yyyy");
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

/**
 * The date range behind a range-filter preset, resolved against the user's own
 * "today" — which is why it lives here and not in the client component: a
 * preset is a calendar boundary, and calendar boundaries are the user's zone
 * (coding-standards.md, Time).
 *
 * "Last 30 days" includes today, so it starts 29 days back. `null` is "All
 * time", the default, which filters `trade_date` not at all.
 */
export function rangeForPreset(
  preset: string | undefined,
  today: IsoDate,
): { from: IsoDate; to: IsoDate } | null {
  if (preset === "month") return monthRangeOf(monthKeyOf(today));

  const days = preset === "30d" ? 30 : preset === "90d" ? 90 : null;
  if (days === null) return null;

  const end = new TZDate(`${today}T00:00:00Z`, "UTC");
  return { from: format(subDays(end, days - 1), "yyyy-MM-dd"), to: today };
}

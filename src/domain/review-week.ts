import { TZDate } from "@date-fns/tz";
import { addDays, addWeeks, format, getDay, startOfWeek } from "date-fns";
import type { IsoDate } from "./streak.ts";

// A review week runs Sunday to Friday (GLOSSARY.md, Review week). Sunday opens
// the new week because Globex opens Sunday evening — the same rule that lands
// a Sunday-dated trade on Monday in the streak (streak.ts, toTradingDay).
// Saturday carries no trading day; as "today" it still belongs to the week
// that just ended, which is the week a trader sits down to review.
//
// Pure calendar arithmetic on UTC-anchored dates, like streak.ts: a date has
// no zone, and the zone was already applied when `today` was derived from
// `users.timezone` (lib/time.ts, todayInTimeZone). Trades fall into a week by
// their `trade_date`, which is chart clock and never converted.

export type ReviewWeekPosition = "past" | "current" | "future";

/** UTC-anchored, for calendar arithmetic only. */
function utcDay(date: IsoDate): TZDate {
  return new TZDate(`${date}T00:00:00Z`, "UTC");
}

/** The Sunday that opens the review week `date` belongs to. */
export function reviewWeekStartOf(date: IsoDate): IsoDate {
  return format(startOfWeek(utcDay(date), { weekStartsOn: 0 }), "yyyy-MM-dd");
}

/** True when `date` is a Sunday, the only valid week start. */
export function isReviewWeekStart(date: IsoDate): boolean {
  return getDay(utcDay(date)) === 0;
}

/** Sunday to Friday of the week opened by `weekStart`, inclusive. */
export function reviewWeekRange(weekStart: IsoDate): {
  from: IsoDate;
  to: IsoDate;
} {
  return {
    from: weekStart,
    to: format(addDays(utcDay(weekStart), 5), "yyyy-MM-dd"),
  };
}

/** `weekStart` moved by `delta` review weeks, negative for backwards. */
export function shiftReviewWeek(weekStart: IsoDate, delta: number): IsoDate {
  return format(addWeeks(utcDay(weekStart), delta), "yyyy-MM-dd");
}

/** How many weeks the review page's strip shows, the current one included. */
export const RECENT_REVIEW_WEEK_COUNT = 8;

/** The current week and the ones before it, oldest first (Design.md §4.26). */
export function recentReviewWeeks(currentWeek: IsoDate): IsoDate[] {
  return Array.from({ length: RECENT_REVIEW_WEEK_COUNT }, (_, index) =>
    shiftReviewWeek(currentWeek, index - (RECENT_REVIEW_WEEK_COUNT - 1)),
  );
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The week a `?week=` search parameter asks for, resolved against `today`.
 * Only a real Sunday up to the current week is taken; anything else opens the
 * current week. The round trip through `format` catches a date that only looks
 * like one: `2026-02-29` would otherwise roll over to Sunday, 1 March.
 */
export function resolveReviewWeek(
  requested: string | undefined,
  today: IsoDate,
): IsoDate {
  const current = reviewWeekStartOf(today);
  if (requested === undefined || !ISO_DATE_PATTERN.test(requested)) {
    return current;
  }
  const day = utcDay(requested);
  if (Number.isNaN(day.getTime()) || format(day, "yyyy-MM-dd") !== requested) {
    return current;
  }
  if (!isReviewWeekStart(requested)) return current;
  return reviewWeekPosition(requested, today) === "future"
    ? current
    : requested;
}

/** Where the week opened by `weekStart` lies relative to `today`'s week. */
export function reviewWeekPosition(
  weekStart: IsoDate,
  today: IsoDate,
): ReviewWeekPosition {
  const current = reviewWeekStartOf(today);
  if (weekStart === current) return "current";
  return weekStart < current ? "past" : "future";
}

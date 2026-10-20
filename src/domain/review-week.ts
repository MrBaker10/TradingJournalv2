import { TZDate } from "@date-fns/tz";
import { addDays, format, getDay, startOfWeek } from "date-fns";
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

/** Where the week opened by `weekStart` lies relative to `today`'s week. */
export function reviewWeekPosition(
  weekStart: IsoDate,
  today: IsoDate,
): ReviewWeekPosition {
  const current = reviewWeekStartOf(today);
  if (weekStart === current) return "current";
  return weekStart < current ? "past" : "future";
}

import { TZDate } from "@date-fns/tz";
import { addDays, format, startOfWeek, subWeeks } from "date-fns";
import { type IsoDate, toTradingDay } from "./streak.ts";

// The heatmap of logged trading days on /progress: which trading day each
// cell is and what state it shows. Calendar arithmetic only; the logged days
// and grace days come from streak.ts.

/** How many weeks the heatmap shows, the current one included. */
export const HEATMAP_WEEK_COUNT = 26;

const WEEKDAYS = [0, 1, 2, 3, 4];

export type HeatmapState = "logged" | "grace" | "open" | "future";

export interface HeatmapCell {
  /** A trading day, Monday to Friday. */
  date: IsoDate;
  /** A logged day stays logged even ahead of today (a Sunday entry). */
  state: HeatmapState;
  isToday: boolean;
}

/** UTC-anchored, for calendar arithmetic only, as in streak.ts. */
function utcDay(date: IsoDate): TZDate {
  return new TZDate(`${date}T00:00:00Z`, "UTC");
}

/**
 * The heatmap of logged days: 26 weeks of trading days, Monday to Friday,
 * oldest week first, ending in the week of today's trading day. Entries are
 * placed on their trading day (GLOSSARY.md), so a Sunday entry fills the
 * Monday after and a Saturday one fills nothing. `today` is the user's own
 * calendar date; `graceDays` are the streak's grace days (`StreakResult`).
 */
export function heatmapWeeks({
  today,
  loggedDates,
  graceDays,
}: {
  today: IsoDate;
  loggedDates: readonly IsoDate[];
  graceDays: readonly IsoDate[];
}): HeatmapCell[][] {
  const grace = new Set(graceDays);
  const logged = new Set(
    loggedDates.map(toTradingDay).filter((date) => date !== null),
  );
  const thisMonday = startOfWeek(utcDay(toTradingDay(today) ?? today), {
    weekStartsOn: 1,
  });

  return Array.from({ length: HEATMAP_WEEK_COUNT }, (_, index) => {
    const monday = subWeeks(thisMonday, HEATMAP_WEEK_COUNT - 1 - index);
    return WEEKDAYS.map((offset) => {
      const date = format(addDays(monday, offset), "yyyy-MM-dd");
      let state: HeatmapState = "open";
      if (logged.has(date)) state = "logged";
      else if (grace.has(date)) state = "grace";
      else if (date > today) state = "future";
      return { date, state, isToday: date === today };
    });
  });
}

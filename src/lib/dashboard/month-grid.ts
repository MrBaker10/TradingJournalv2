import { TZDate } from "@date-fns/tz";
import { addDays, format, getISODay } from "date-fns";
import type { IsoDate } from "../../domain/streak.ts";
import { type MonthKey, monthRangeOf } from "../time.ts";

export interface MonthGridCell<Day> {
  date: IsoDate;
  /** False for the neighbouring months' days that pad the first and last week. */
  inMonth: boolean;
  isToday: boolean;
  /** The day's total, or undefined when nothing was logged that day. */
  day: Day | undefined;
}

/** UTC-anchored: a date string carries no zone, and the machine's must not leak in. */
function dayOf(date: IsoDate): TZDate {
  return new TZDate(`${date}T00:00:00Z`, "UTC");
}

/**
 * The dashboard calendar as Monday-first weeks of seven cells covering `month`.
 * A calendar grid, not the trading week: Sunday folding onto Monday is a
 * streak rule and lives in src/domain/streak.ts.
 */
export function monthGrid<Day extends { date: IsoDate }>(
  month: MonthKey,
  today: IsoDate,
  days: Day[],
): MonthGridCell<Day>[][] {
  const byDate = new Map(days.map((day) => [day.date, day]));
  const range = monthRangeOf(month);
  const first = dayOf(range.from);
  let cursor = addDays(first, 1 - getISODay(first));
  const weeks: MonthGridCell<Day>[][] = [];

  while (format(cursor, "yyyy-MM-dd") <= range.to) {
    const week: MonthGridCell<Day>[] = [];
    for (let index = 0; index < 7; index++) {
      const date = format(cursor, "yyyy-MM-dd");
      week.push({
        date,
        inMonth: date.startsWith(month),
        isToday: date === today,
        day: byDate.get(date),
      });
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

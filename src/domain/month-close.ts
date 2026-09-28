import { type IsoDate, STREAK_WINDOW_HOURS } from "./streak.ts";

// Month close: when the consistency score of a finished month is frozen into
// `monthly_scores`, decided 2026-09-28 (P2.6):
//
// - The job runs daily. For each user it looks at exactly one month, the one
//   before `today` — past months are never recomputed.
// - It waits out the same 48h grace the streak gives a late entry, so an
//   entry logged a day after the month ended for its last day still counts.
//   Midnight on the 1st plus 48h is midnight on the 3rd; the local calendar
//   day 3 is therefore always at least 48 real hours in, even across a
//   daylight-saving switch on the 1st (then it is 49).
// - On the close day itself the row is upserted, so a second run that day
//   overwrites. From the day after, it is written only when missing — a run
//   that failed on the close day is caught up, a written month stays frozen.
// - Every month from the user's registration month on gets a row, zero
//   included. A month that ended before the user registered gets none.
//
// `today` is the user's own calendar date (`users.timezone`). The module has
// no clock and no DB access.

/** A `YYYY-MM` month key, matching `monthly_scores.month`. */
type MonthKey = string;

/** The first day of a month on which its predecessor may be closed. */
export const CLOSE_DAY = 1 + STREAK_WINDOW_HOURS / 24;

export interface MonthToClose {
  month: MonthKey;
  /** True on `CLOSE_DAY` itself, the one day a run may overwrite. */
  isCloseDay: boolean;
}

/**
 * The month before `month`, as pure string work — a month key has no zone,
 * so there is nothing for a date library to get right here.
 */
export function previousMonth(month: MonthKey): MonthKey {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  if (monthNumber === 1) return `${year - 1}-12`;
  return `${year}-${String(monthNumber - 1).padStart(2, "0")}`;
}

/**
 * Which month a run on `today` closes for a user who registered in
 * `registeredMonth`, or `null` while the grace is still running or when the
 * month ended before the user existed.
 */
export function monthToClose(
  today: IsoDate,
  registeredMonth: MonthKey,
): MonthToClose | null {
  const dayOfMonth = Number(today.slice(8, 10));
  if (dayOfMonth < CLOSE_DAY) return null;

  const month = previousMonth(today.slice(0, 7));
  // `YYYY-MM` keys compare correctly as strings.
  if (month < registeredMonth) return null;

  return { month, isCloseDay: dayOfMonth === CLOSE_DAY };
}

/** Whether this run writes the row: always on the close day, else only if missing. */
export function shouldWrite(isCloseDay: boolean, rowExists: boolean): boolean {
  return isCloseDay || !rowExists;
}

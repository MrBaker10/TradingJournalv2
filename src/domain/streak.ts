import { TZDate } from "@date-fns/tz";
import { addDays, addHours, format, getDay } from "date-fns";

// Streak rules, verbatim from project-structure.md ("Rules the code must
// honour"):
//
//   A logged day is a trading day with at least one entry, taken or missed.
//   Counting requires logging within 48h of the trade date; later backfills
//   count for every other stat and for trade-count badges but never
//   manufacture a streak. Saturdays are skipped entirely. Sunday belongs to
//   the new week because Globex opens Sunday evening, so a Sunday-dated trade
//   lands on Monday. One grace day per calendar month. Today never counts
//   against the user until it is over.
//
// Contract:
//
// - `entries` must already be filtered to the current user's real accounts.
//   "Streak, consistency score and badges see real accounts only"
//   (project-structure.md) — this module has no DB access, so the caller owns
//   that filter.
// - Days are counted, not trade rows. A trade assigned to three accounts is
//   one entry and one streak day; the caller groups before counting, or a
//   join over trade_accounts silently triples everything.
// - `today` is the current calendar date in the user's own timezone
//   (`users.timezone`), never UTC and never the server's zone. The clock is
//   that argument, never Date.now().
//
// Two kinds of date work live here and must not be mixed up:
//
// - Pure calendar arithmetic (which weekday is this, what is the next day)
//   runs on a UTC-anchored TZDate. A date without a time has no zone; UTC is
//   only the anchor that keeps the result independent of the machine. The
//   trailing `Z` is mandatory — without it TZDate reads the string in the
//   system zone and returns the wrong day under a shifted TZ.
// - An instant meeting a date happens exactly once, in the 48h window. That
//   one uses the user's timezone, built from the date parts.

/** A date-only string, `YYYY-MM-DD` — the shape of `trades.trade_date`. */
export type IsoDate = string;

export interface StreakEntry {
  tradeDate: IsoDate;
  /** `trades.created_at` — the instant the entry was logged. */
  loggedAt: Date;
}

export interface StreakResult {
  /** Logged trading days in the run that is still alive today. */
  current: number;
  longest: number;
  /** True once this calendar month's single grace day is spent. */
  graceDayUsed: boolean;
  /** The missed weekday the grace day was spent on, this month. */
  graceDayDate: IsoDate | null;
}

export const STREAK_WINDOW_HOURS = 48;

/** UTC-anchored, for calendar arithmetic only. See the note at the top. */
function utcDay(date: IsoDate): TZDate {
  return new TZDate(`${date}T00:00:00Z`, "UTC");
}

/** Midnight on that date in the user's own calendar. */
function startOfDayInZone(date: IsoDate, timeZone: string): TZDate {
  const [year, month, day] = date.split("-").map(Number);
  return new TZDate(year, month - 1, day, timeZone);
}

function toIsoDate(day: TZDate): IsoDate {
  return format(day, "yyyy-MM-dd");
}

function monthOf(date: IsoDate): string {
  return date.slice(0, 7);
}

/** Trading days are Monday to Friday. Saturday and Sunday are not. */
export function isTradingDay(date: IsoDate): boolean {
  const weekday = getDay(utcDay(date));
  return weekday >= 1 && weekday <= 5;
}

/**
 * The trading day an entry belongs to. A Sunday-dated trade lands on the
 * following Monday; a Saturday-dated one belongs to no trading day at all and
 * is dropped from the streak (it still counts for every other stat).
 */
export function toTradingDay(date: IsoDate): IsoDate | null {
  const weekday = getDay(utcDay(date));
  if (weekday === 6) return null;
  if (weekday === 0) return toIsoDate(addDays(utcDay(date), 1));
  return date;
}

/**
 * Only an entry logged within 48h of midnight on its trade date can build a
 * streak. Midnight is the user's, so the window opens when their day did. A
 * later backfill is not rejected anywhere else — it simply cannot manufacture
 * a day that was never journaled in time.
 *
 * 48 real hours, not two calendar days: across a daylight-saving switch the
 * deadline lands an hour off local midnight, which is what a duration means.
 */
export function countsForStreak(entry: StreakEntry, timeZone: string): boolean {
  const deadline = addHours(
    startOfDayInZone(entry.tradeDate, timeZone),
    STREAK_WINDOW_HOURS,
  );
  return entry.loggedAt.getTime() <= deadline.getTime();
}

function streakDaysOf(entries: StreakEntry[], timeZone: string): Set<IsoDate> {
  const days = new Set<IsoDate>();
  for (const entry of entries) {
    if (!countsForStreak(entry, timeZone)) continue;
    const day = toTradingDay(entry.tradeDate);
    if (day !== null) days.add(day);
  }
  return days;
}

export function calculateStreak(
  entries: StreakEntry[],
  today: IsoDate,
  timeZone: string,
): StreakResult {
  const logged = streakDaysOf(entries, timeZone);
  if (logged.size === 0) {
    return { current: 0, longest: 0, graceDayUsed: false, graceDayDate: null };
  }

  const sorted = [...logged].sort();
  const firstDay = sorted[0];
  const lastLogged = sorted[sorted.length - 1];
  // A Sunday entry can land on a Monday that has not arrived yet, so the walk
  // runs past today when the user is already credited for it.
  const lastDay = lastLogged > today ? lastLogged : today;

  // One grace day per calendar month, keyed by the month of the missed day.
  // Once spent it stays spent, even if the streak breaks and restarts inside
  // the same month.
  const graceByMonth = new Map<string, IsoDate>();
  let current = 0;
  let longest = 0;

  let cursor = utcDay(firstDay);
  const end = utcDay(lastDay);
  while (cursor.getTime() <= end.getTime()) {
    const day = toIsoDate(cursor);
    cursor = addDays(cursor, 1);

    if (!isTradingDay(day)) continue;
    if (logged.has(day)) {
      current += 1;
      continue;
    }
    // Today, and any day beyond it, never counts against the user.
    if (day >= today) continue;

    const month = monthOf(day);
    if (!graceByMonth.has(month)) {
      graceByMonth.set(month, day);
      continue;
    }
    if (current > longest) longest = current;
    current = 0;
  }
  if (current > longest) longest = current;

  const thisMonth = monthOf(today);
  return {
    current,
    longest,
    graceDayUsed: graceByMonth.has(thisMonth),
    graceDayDate: graceByMonth.get(thisMonth) ?? null,
  };
}

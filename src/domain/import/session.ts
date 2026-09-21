// Which session an entry time falls into.
//
// The windows were fixed when S10a was loaded and are recorded in
// decisions.md. They are **New York** times, because that is what their names
// mean: "NY-AM" is the New York morning wherever the trader happens to sit.
//
// The chart clock, however, is the trader's own zone (`users.timezone`), and
// `entry_time` carries it. So the two clocks have to be brought together, and
// this module is the only place that does it: it moves the entry time onto the
// New York clock, asks which window covers it, and throws the converted value
// away. Nothing it returns is a time, and no caller ever sees one — the stored
// chart clock stays untouched (coding-standards.md, Time).
//
// The conversion needs the **date**, not just the time. New York and the
// user's zone change to summer time on different days, so the offset between
// them is not a constant: Berlin and New York sit six hours apart for most of
// the year and five for about three weeks in March and one in late October,
// when New York has already changed over and Europe has not.
//
// The import writes this only on a row it creates itself, and only when the
// trade has no session yet. A session the user picked is never overwritten,
// and a matched trade's session is never written at all
// (current-feature.md, §Was ein Update überschreiben darf).

import { TZDate } from "@date-fns/tz";

/** Matches `sessionEnum` in src/schemas/trades.ts. */
export type Session = "Asia" | "London" | "NY-AM" | "NY-PM";

export interface SessionWindow {
  session: Session;
  /** Minutes since midnight on the New York clock, inclusive. */
  start: number;
  /** Minutes since midnight on the New York clock, exclusive. */
  end: number;
}

const HOUR = 60;

/** The clock SESSION_WINDOWS is written on. */
const MARKET_ZONE = "America/New_York";

/**
 * Asia wraps midnight, so its `start` is greater than its `end`; every other
 * window reads straight. The gap from 16:00 to 18:00 belongs to no session
 * and stays empty rather than being folded into a neighbour.
 */
export const SESSION_WINDOWS: SessionWindow[] = [
  { session: "Asia", start: 18 * HOUR, end: 3 * HOUR },
  { session: "London", start: 3 * HOUR, end: 9 * HOUR + 30 },
  { session: "NY-AM", start: 9 * HOUR + 30, end: 12 * HOUR },
  { session: "NY-PM", start: 12 * HOUR, end: 16 * HOUR },
];

const TIME_PATTERN = /^(\d{2}):(\d{2})(?::\d{2})?$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Minutes since midnight, or null when the string is not a chart-clock time.
 *
 * Seconds are accepted and dropped: a window boundary is a minute, and a file
 * that reports `09:29:59` entered before the NY open.
 */
function minutesSinceMidnight(time: string): number | null {
  const match = TIME_PATTERN.exec(time);
  if (match === null) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return hours * HOUR + minutes;
}

/**
 * The same wall-clock moment read on the New York clock, in minutes since
 * midnight — or null when the date cannot be read.
 *
 * `TZDate` takes the parts as a wall clock in `timeZone` and `withTimeZone`
 * re-reads that one instant elsewhere, which is exactly the question being
 * asked: what did the New York clock say when this trader's clock said this?
 */
function onMarketClock(
  tradeDate: string,
  minute: number,
  timeZone: string,
): number | null {
  const match = DATE_PATTERN.exec(tradeDate);
  if (match === null) return null;

  const local = new TZDate(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Math.floor(minute / HOUR),
    minute % HOUR,
    timeZone,
  );
  if (Number.isNaN(local.getTime())) return null;

  const market = local.withTimeZone(MARKET_ZONE);
  return market.getHours() * HOUR + market.getMinutes();
}

/**
 * The session an entry time falls into, or null when it falls in the gap
 * between the NY close and the Asia open — or when the time or the date
 * cannot be read at all. Both are the same answer for the caller: leave the
 * field empty.
 *
 * @param entryTime - Chart-clock time, `HH:MM` or `HH:MM:SS`.
 * @param tradeDate - The chart-clock date the time belongs to, `YYYY-MM-DD`.
 *   Needed because the offset to New York depends on the day.
 * @param timeZone - The trader's zone, `users.timezone`.
 */
export function sessionFromEntryTime(
  entryTime: string,
  tradeDate: string,
  timeZone: string,
): Session | null {
  const minute = minutesSinceMidnight(entryTime);
  if (minute === null) return null;

  const marketMinute = onMarketClock(tradeDate, minute, timeZone);
  if (marketMinute === null) return null;

  const window = SESSION_WINDOWS.find((candidate) =>
    covers(candidate, marketMinute),
  );
  return window?.session ?? null;
}

function covers(window: SessionWindow, minute: number): boolean {
  if (window.start < window.end) {
    return minute >= window.start && minute < window.end;
  }
  // Wraps midnight: everything from the start to the end of the day, plus
  // everything from midnight to the end.
  return minute >= window.start || minute < window.end;
}

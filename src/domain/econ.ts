import { TZDate } from "@date-fns/tz";
import { addDays, addWeeks, format, startOfDay, startOfWeek } from "date-fns";
import type { IsoDate } from "./streak.ts";

// The econ calendar's two rules about time (project-overview.md, I).
//
// Which week an event belongs to is the feed's answer, not the user's: Forex
// Factory publishes one file per week, Sunday to Saturday in New York, and the
// "This week" / "Next week" tabs are exactly those two files. A boundary in
// the user's zone would drop the Sunday-evening events of a trader west of New
// York into a week that is not shown at all. This is the one calendar boundary
// the user's zone does not decide (coding-standards.md, Time).
//
// Which *day* an event is shown under, and at what time, is the user's zone —
// `users.timezone`, the only place a zone is applied to a stored value. So is
// the "Today" tab: a day is a calendar boundary, and those are the user's.

/** The zone the feed's weeks are cut in. */
export const FEED_TIME_ZONE = "America/New_York";

export const ECON_TABS = ["today", "this", "next", "both"] as const;
export type EconTab = (typeof ECON_TABS)[number];

export interface EconEvent {
  occursAt: Date;
  currency: string;
  title: string;
  impact: string;
  forecast: string | null;
  previous: string | null;
}

/**
 * Sunday 00:00 New York of the feed week that contains `now`. On the Sunday
 * the clocks change, midnight is still midnight: the arithmetic runs in the
 * feed's zone, not in fixed 24-hour steps.
 */
export function feedWeekStart(now: Date): Date {
  const start = startOfWeek(new TZDate(now, FEED_TIME_ZONE), {
    weekStartsOn: 0,
  });
  return new Date(start.getTime());
}

/**
 * The half-open range `[from, to)` a tab shows, relative to `now`. "today" is
 * the user's calendar day in `timeZone` — 23 or 25 hours on the days the
 * clocks change; the week tabs are the feed weeks in New York.
 */
export function tabRange(
  tab: EconTab,
  now: Date,
  timeZone: string,
): { from: Date; to: Date } {
  if (tab === "today") {
    const today = startOfDay(new TZDate(now, timeZone));
    return {
      from: new Date(today.getTime()),
      to: new Date(addDays(today, 1).getTime()),
    };
  }
  const thisWeek = new TZDate(feedWeekStart(now), FEED_TIME_ZONE);
  const from = tab === "next" ? addWeeks(thisWeek, 1) : thisWeek;
  const to = addWeeks(thisWeek, tab === "this" ? 1 : 2);
  return { from: new Date(from.getTime()), to: new Date(to.getTime()) };
}

/**
 * Whether an event is over at `now`. At its own minute it counts as past: the
 * number is out, and the row is struck through from that moment on.
 */
export function isPast(occursAt: Date, now: Date): boolean {
  return occursAt.getTime() <= now.getTime();
}

export interface EconDay<T> {
  date: IsoDate;
  events: T[];
}

/**
 * Events grouped under the calendar day they fall on in `timeZone`, the
 * user's. Keeps the input order within and across days, so a list sorted by
 * `occursAt` stays sorted.
 */
export function groupByDay<T extends { occursAt: Date }>(
  events: T[],
  timeZone: string,
): EconDay<T>[] {
  const days: EconDay<T>[] = [];
  for (const event of events) {
    const date = format(new TZDate(event.occursAt, timeZone), "yyyy-MM-dd");
    const last = days.at(-1);
    if (last?.date === date) last.events.push(event);
    else days.push({ date, events: [event] });
  }
  return days;
}

/** The feed's top impact level. Holiday is not high impact — nothing moves. */
export const HIGH_IMPACT = "High";

export function isHighImpact(impact: string): boolean {
  return impact === HIGH_IMPACT;
}

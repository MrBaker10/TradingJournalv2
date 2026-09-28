import { describe, expect, it } from "vitest";
import {
  feedWeekStart,
  groupByDay,
  isHighImpact,
  isPast,
  tabRange,
} from "../econ.ts";

// The feed week of 2026-09-28 runs from Sunday 09-27 00:00 EDT (04:00Z) to
// Sunday 10-04 00:00 EDT. New York leaves daylight saving on Sunday 11-01, so
// the week starting that day begins at 04:00Z and ends at 05:00Z.

describe("feedWeekStart", () => {
  it("is Sunday midnight New York for a weekday", () => {
    expect(feedWeekStart(new Date("2026-09-28T07:30:00Z"))).toEqual(
      new Date("2026-09-27T04:00:00Z"),
    );
  });

  it("keeps Saturday 23:59 New York in the week that is ending", () => {
    // Already Sunday 03:59 in UTC and 05:59 in Berlin.
    expect(feedWeekStart(new Date("2026-10-04T03:59:00Z"))).toEqual(
      new Date("2026-09-27T04:00:00Z"),
    );
  });

  it("starts the next week at Sunday 00:00 New York exactly", () => {
    expect(feedWeekStart(new Date("2026-10-04T04:00:00Z"))).toEqual(
      new Date("2026-10-04T04:00:00Z"),
    );
  });

  it("is midnight daylight time on the Sunday the clocks go back", () => {
    // 07:00 EST on 11-01, after the change at 02:00 EDT.
    expect(feedWeekStart(new Date("2026-11-01T12:00:00Z"))).toEqual(
      new Date("2026-11-01T04:00:00Z"),
    );
  });
});

describe("tabRange, week tabs", () => {
  const now = new Date("2026-09-30T15:00:00Z");

  it("covers this feed week, half-open", () => {
    expect(tabRange("this", now, "Europe/Berlin")).toEqual({
      from: new Date("2026-09-27T04:00:00Z"),
      to: new Date("2026-10-04T04:00:00Z"),
    });
  });

  it("covers the week after for next", () => {
    expect(tabRange("next", now, "Europe/Berlin")).toEqual({
      from: new Date("2026-10-04T04:00:00Z"),
      to: new Date("2026-10-11T04:00:00Z"),
    });
  });

  it("covers both weeks for both", () => {
    expect(tabRange("both", now, "Europe/Berlin")).toEqual({
      from: new Date("2026-09-27T04:00:00Z"),
      to: new Date("2026-10-11T04:00:00Z"),
    });
  });

  it("ends a week across the clock change at midnight standard time", () => {
    const wednesday = new Date("2026-10-28T15:00:00Z");
    expect(tabRange("next", wednesday, "Europe/Berlin")).toEqual({
      from: new Date("2026-11-01T04:00:00Z"),
      to: new Date("2026-11-08T05:00:00Z"),
    });
    expect(tabRange("both", wednesday, "Europe/Berlin").to).toEqual(
      new Date("2026-11-08T05:00:00Z"),
    );
  });
});

describe("tabRange, today", () => {
  it("is the user's calendar day, not UTC's", () => {
    // 23:30Z on 09-28 is already 01:30 on 09-29 in Berlin.
    expect(
      tabRange("today", new Date("2026-09-28T23:30:00Z"), "Europe/Berlin"),
    ).toEqual({
      from: new Date("2026-09-28T22:00:00Z"),
      to: new Date("2026-09-29T22:00:00Z"),
    });
    expect(
      tabRange("today", new Date("2026-09-28T23:30:00Z"), "America/New_York"),
    ).toEqual({
      from: new Date("2026-09-28T04:00:00Z"),
      to: new Date("2026-09-29T04:00:00Z"),
    });
  });

  it("lasts 25 hours on the day Berlin leaves summer time", () => {
    expect(
      tabRange("today", new Date("2026-10-25T12:00:00Z"), "Europe/Berlin"),
    ).toEqual({
      from: new Date("2026-10-24T22:00:00Z"),
      to: new Date("2026-10-25T23:00:00Z"),
    });
  });

  it("ignores the feed week", () => {
    // Sunday in Berlin, still Saturday evening of the old feed week in New York.
    expect(
      tabRange("today", new Date("2026-10-03T23:00:00Z"), "Europe/Berlin"),
    ).toEqual({
      from: new Date("2026-10-03T22:00:00Z"),
      to: new Date("2026-10-04T22:00:00Z"),
    });
  });
});

describe("isPast", () => {
  const release = new Date("2026-10-02T12:30:00Z");

  it("is false before, true at and after the event", () => {
    expect(isPast(release, new Date("2026-10-02T12:29:59Z"))).toBe(false);
    expect(isPast(release, release)).toBe(true);
    expect(isPast(release, new Date("2026-10-02T12:30:01Z"))).toBe(true);
  });
});

describe("groupByDay", () => {
  // Sunday 19:50 EDT — the first event of the week in the real feed.
  const sundayEvening = { id: 1, occursAt: new Date("2026-09-27T23:50:00Z") };
  // Monday 06:00 EDT.
  const mondayMorning = { id: 2, occursAt: new Date("2026-09-28T10:00:00Z") };
  // Monday 13:25 EDT.
  const mondayAfternoon = { id: 3, occursAt: new Date("2026-09-28T17:25:00Z") };
  const events = [sundayEvening, mondayMorning, mondayAfternoon];

  it("moves a Sunday-evening New York event to Monday in Berlin", () => {
    expect(groupByDay(events, "Europe/Berlin")).toEqual([
      { date: "2026-09-28", events },
    ]);
  });

  it("keeps it on Sunday in New York", () => {
    expect(groupByDay(events, "America/New_York")).toEqual([
      { date: "2026-09-27", events: [sundayEvening] },
      { date: "2026-09-28", events: [mondayMorning, mondayAfternoon] },
    ]);
  });

  it("returns no days for no events", () => {
    expect(groupByDay([], "Europe/Berlin")).toEqual([]);
  });
});

describe("isHighImpact", () => {
  it("is true for High only", () => {
    expect(isHighImpact("High")).toBe(true);
    for (const impact of ["Medium", "Low", "Holiday", "high"]) {
      expect(isHighImpact(impact)).toBe(false);
    }
  });
});

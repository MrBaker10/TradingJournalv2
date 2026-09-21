import { describe, expect, it } from "vitest";
import {
  calendarDateOf,
  formatDayLabel,
  formatMonthLabel,
  monthKeyOf,
  monthRangeOf,
  rangeForPreset,
  todayInTimeZone,
} from "../time.ts";

describe("todayInTimeZone", () => {
  it("returns the date of the user's own calendar, not UTC's", () => {
    // 23:30 UTC is already tomorrow in Berlin and still yesterday's evening
    // in New York. Both users see their own day.
    const instant = new Date("2026-09-12T23:30:00Z");
    expect(todayInTimeZone("Europe/Berlin", instant)).toBe("2026-09-13");
    expect(todayInTimeZone("America/New_York", instant)).toBe("2026-09-12");
    expect(todayInTimeZone("UTC", instant)).toBe("2026-09-12");
  });

  it("crosses the month boundary in the user's zone", () => {
    const instant = new Date("2026-09-30T22:15:00Z");
    expect(todayInTimeZone("Europe/Berlin", instant)).toBe("2026-10-01");
    expect(todayInTimeZone("UTC", instant)).toBe("2026-09-30");
  });

  it("handles a zone ahead of the date line", () => {
    const instant = new Date("2026-09-12T12:00:00Z");
    expect(todayInTimeZone("Pacific/Kiritimati", instant)).toBe("2026-09-13");
  });

  it("uses the current instant when none is passed", () => {
    expect(todayInTimeZone("UTC")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("calendarDateOf", () => {
  // 22:30 UTC is already the next day in Berlin. An import batch created then
  // has to be listed under the day the trader experienced, not under UTC's.
  const lateEvening = new Date("2026-09-21T22:30:00Z");

  it("reads an instant in the user's zone", () => {
    expect(calendarDateOf(lateEvening, "Europe/Berlin")).toBe("2026-09-22");
  });

  it("gives the same instant a different date in another zone", () => {
    expect(calendarDateOf(lateEvening, "UTC")).toBe("2026-09-21");
    expect(calendarDateOf(lateEvening, "America/New_York")).toBe("2026-09-21");
  });
});

describe("monthKeyOf", () => {
  it("takes the month of a date", () => {
    expect(monthKeyOf("2026-09-12")).toBe("2026-09");
    expect(monthKeyOf("2026-01-01")).toBe("2026-01");
  });
});

describe("formatDayLabel", () => {
  it("renders the date the string says, in any machine timezone", () => {
    expect(formatDayLabel("2026-09-03")).toBe("Sep 3");
    expect(formatDayLabel("2026-01-01")).toBe("Jan 1");
    expect(formatDayLabel("2026-12-31")).toBe("Dec 31");
  });
});

describe("formatMonthLabel", () => {
  it("renders the month the key says, in any machine timezone", () => {
    expect(formatMonthLabel("2026-09")).toBe("September 2026");
    expect(formatMonthLabel("2026-01")).toBe("January 2026");
    expect(formatMonthLabel("2026-12")).toBe("December 2026");
  });
});

describe("monthRangeOf", () => {
  it("spans a 30-day month", () => {
    expect(monthRangeOf("2026-09")).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
    });
  });

  it("spans a 31-day month", () => {
    expect(monthRangeOf("2026-12")).toEqual({
      from: "2026-12-01",
      to: "2026-12-31",
    });
  });

  it("spans February in a common year", () => {
    expect(monthRangeOf("2026-02")).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });

  it("spans February in a leap year", () => {
    expect(monthRangeOf("2028-02")).toEqual({
      from: "2028-02-01",
      to: "2028-02-29",
    });
  });
});

describe("rangeForPreset", () => {
  it("has no range at all for All time", () => {
    expect(rangeForPreset(undefined, "2026-09-16")).toBeNull();
    expect(rangeForPreset("all", "2026-09-16")).toBeNull();
    expect(rangeForPreset("nonsense", "2026-09-16")).toBeNull();
  });

  it("counts today as one of the last 30 days", () => {
    expect(rangeForPreset("30d", "2026-09-16")).toEqual({
      from: "2026-08-18",
      to: "2026-09-16",
    });
  });

  it("counts today as one of the last 90 days", () => {
    expect(rangeForPreset("90d", "2026-09-16")).toEqual({
      from: "2026-06-19",
      to: "2026-09-16",
    });
  });

  it("crosses a year boundary without drifting", () => {
    expect(rangeForPreset("30d", "2027-01-05")).toEqual({
      from: "2026-12-07",
      to: "2027-01-05",
    });
  });

  it("spans the calendar month the day belongs to", () => {
    expect(rangeForPreset("month", "2026-09-16")).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
    });
  });
});

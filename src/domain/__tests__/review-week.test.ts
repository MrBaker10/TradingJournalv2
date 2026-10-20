import { describe, expect, it } from "vitest";
import { todayInTimeZone } from "../../lib/time.ts";
import {
  isReviewWeekStart,
  RECENT_REVIEW_WEEK_COUNT,
  recentReviewWeeks,
  resolveReviewWeek,
  reviewWeekPosition,
  reviewWeekRange,
  reviewWeekStartOf,
  shiftReviewWeek,
} from "../review-week.ts";

// October 2026 calendar used throughout:
//   Su 10-11  Mo 10-12  Tu 10-13  We 10-14  Th 10-15  Fr 10-16  Sa 10-17
//   Su 10-18  Mo 10-19  Tu 10-20  We 10-21  Th 10-22  Fr 10-23  Sa 10-24
//   Su 10-25 (EU clocks go back)   Su 11-01 (US clocks go back)

describe("reviewWeekStartOf", () => {
  it("opens the week on Sunday", () => {
    expect(reviewWeekStartOf("2026-10-18")).toBe("2026-10-18");
  });

  it("maps Monday to Friday onto the Sunday before", () => {
    for (const date of [
      "2026-10-19",
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
    ]) {
      expect(reviewWeekStartOf(date)).toBe("2026-10-18");
    }
  });

  it("keeps Saturday in the week that just ended", () => {
    expect(reviewWeekStartOf("2026-10-24")).toBe("2026-10-18");
  });

  it("crosses month and year boundaries", () => {
    expect(reviewWeekStartOf("2026-11-04")).toBe("2026-11-01");
    expect(reviewWeekStartOf("2027-01-01")).toBe("2026-12-27");
  });

  it("is unaffected by DST transition weeks", () => {
    // EU: 2026-03-29 and 2026-10-25; US: 2026-03-08 and 2026-11-01.
    expect(reviewWeekStartOf("2026-03-31")).toBe("2026-03-29");
    expect(reviewWeekStartOf("2026-10-27")).toBe("2026-10-25");
    expect(reviewWeekStartOf("2026-03-10")).toBe("2026-03-08");
    expect(reviewWeekStartOf("2026-11-06")).toBe("2026-11-01");
  });
});

describe("isReviewWeekStart", () => {
  it("accepts Sundays only", () => {
    expect(isReviewWeekStart("2026-10-18")).toBe(true);
    expect(isReviewWeekStart("2026-10-19")).toBe(false);
    expect(isReviewWeekStart("2026-10-24")).toBe(false);
  });
});

describe("reviewWeekRange", () => {
  it("runs Sunday to Friday", () => {
    expect(reviewWeekRange("2026-10-18")).toEqual({
      from: "2026-10-18",
      to: "2026-10-23",
    });
  });

  it("keeps six calendar days across a DST switch", () => {
    expect(reviewWeekRange("2026-10-25")).toEqual({
      from: "2026-10-25",
      to: "2026-10-30",
    });
    expect(reviewWeekRange("2026-03-29")).toEqual({
      from: "2026-03-29",
      to: "2026-04-03",
    });
  });
});

describe("reviewWeekPosition", () => {
  it("places weeks around today", () => {
    expect(reviewWeekPosition("2026-10-18", "2026-10-20")).toBe("current");
    expect(reviewWeekPosition("2026-10-11", "2026-10-20")).toBe("past");
    expect(reviewWeekPosition("2026-10-25", "2026-10-20")).toBe("future");
  });

  it("still calls the ended week current on Saturday", () => {
    expect(reviewWeekPosition("2026-10-18", "2026-10-24")).toBe("current");
    expect(reviewWeekPosition("2026-10-25", "2026-10-24")).toBe("future");
  });

  it("follows the user's calendar, not UTC", () => {
    // Saturday 2026-10-24, 13:00 UTC is already Sunday 02:00 in Auckland:
    // the Auckland user is in the new week while a UTC user is not.
    const instant = new Date("2026-10-24T13:00:00Z");
    const auckland = todayInTimeZone("Pacific/Auckland", instant);
    const utc = todayInTimeZone("UTC", instant);

    expect(reviewWeekPosition("2026-10-25", auckland)).toBe("current");
    expect(reviewWeekPosition("2026-10-25", utc)).toBe("future");
  });

  it("follows the user's calendar across their DST switch", () => {
    // Sunday 2026-11-01 00:30 in New York (EDT, -4) is 04:30 UTC. An hour
    // later clocks go back; the user's date is still Sunday either way.
    const instant = new Date("2026-11-01T04:30:00Z");
    const newYork = todayInTimeZone("America/New_York", instant);

    expect(newYork).toBe("2026-11-01");
    expect(reviewWeekPosition("2026-11-01", newYork)).toBe("current");
    expect(reviewWeekPosition("2026-10-25", newYork)).toBe("past");
  });
});

describe("resolveReviewWeek", () => {
  const today = "2026-10-20";

  it("opens the current week without a parameter", () => {
    expect(resolveReviewWeek(undefined, today)).toBe("2026-10-18");
  });

  it("opens a past week that starts on a Sunday", () => {
    expect(resolveReviewWeek("2026-09-27", today)).toBe("2026-09-27");
  });

  it("falls back to the current week for a future week", () => {
    expect(resolveReviewWeek("2026-10-25", today)).toBe("2026-10-18");
  });

  it("falls back to the current week for a day that is no Sunday", () => {
    expect(resolveReviewWeek("2026-10-14", today)).toBe("2026-10-18");
  });

  it("falls back to the current week for anything that is no date", () => {
    for (const value of [
      "",
      "2026-10",
      "yesterday",
      "2026-02-29",
      "2026-13-01",
    ]) {
      expect(resolveReviewWeek(value, today)).toBe("2026-10-18");
    }
  });
});

describe("shiftReviewWeek", () => {
  it("steps one week back and forth", () => {
    expect(shiftReviewWeek("2026-10-18", -1)).toBe("2026-10-11");
    expect(shiftReviewWeek("2026-10-18", 1)).toBe("2026-10-25");
  });

  it("crosses a DST switch and a year boundary on Sundays", () => {
    expect(shiftReviewWeek("2026-10-25", 1)).toBe("2026-11-01");
    expect(shiftReviewWeek("2027-01-03", -1)).toBe("2026-12-27");
    expect(shiftReviewWeek("2026-10-18", -7)).toBe("2026-08-30");
  });
});

describe("recentReviewWeeks", () => {
  it("lists the current week and the ones before it, oldest first", () => {
    const weeks = recentReviewWeeks("2026-10-18");

    expect(weeks).toHaveLength(RECENT_REVIEW_WEEK_COUNT);
    expect(weeks[0]).toBe("2026-08-30");
    expect(weeks[weeks.length - 1]).toBe("2026-10-18");
  });
});

import { describe, expect, it } from "vitest";
import {
  calculateStreak,
  countsForStreak,
  isTradingDay,
  type StreakEntry,
  toTradingDay,
} from "../streak.ts";

// September 2026 calendar used throughout:
//   Mo 09-07  Tu 09-08  We 09-09  Th 09-10  Fr 09-11  Sa 09-12  Su 09-13
//   Mo 09-14  Tu 09-15  We 09-16  Th 09-17  Fr 09-18
//   Mo 09-28  Tu 09-29  We 09-30  Th 10-01  Fr 10-02  Mo 10-05
//
// Unless a test is about timezones, everything runs in UTC so the numbers
// stay readable.

// Logged at 18:00 UTC on the trade date itself — always inside the window.
function sameDay(tradeDate: string): StreakEntry {
  return { tradeDate, loggedAt: new Date(`${tradeDate}T18:00:00Z`) };
}

function loggedDays(dates: string[]): StreakEntry[] {
  return dates.map(sameDay);
}

describe("isTradingDay", () => {
  it("accepts Monday through Friday", () => {
    for (const date of [
      "2026-09-07",
      "2026-09-08",
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
    ]) {
      expect(isTradingDay(date)).toBe(true);
    }
  });

  it("rejects Saturday and Sunday", () => {
    expect(isTradingDay("2026-09-12")).toBe(false);
    expect(isTradingDay("2026-09-13")).toBe(false);
  });
});

describe("toTradingDay", () => {
  it("leaves a weekday untouched", () => {
    expect(toTradingDay("2026-09-09")).toBe("2026-09-09");
  });

  it("folds a Sunday onto the following Monday", () => {
    expect(toTradingDay("2026-09-13")).toBe("2026-09-14");
  });

  it("drops a Saturday — it is not a trading day", () => {
    expect(toTradingDay("2026-09-12")).toBeNull();
  });
});

describe("countsForStreak", () => {
  it("counts an entry logged on the trade date", () => {
    expect(countsForStreak(sameDay("2026-09-09"), "UTC")).toBe(true);
  });

  it("counts an entry logged exactly 48h after midnight of the trade date", () => {
    expect(
      countsForStreak(
        {
          tradeDate: "2026-09-09",
          loggedAt: new Date("2026-09-11T00:00:00Z"),
        },
        "UTC",
      ),
    ).toBe(true);
  });

  it("rejects an entry logged one millisecond past the window", () => {
    expect(
      countsForStreak(
        {
          tradeDate: "2026-09-09",
          loggedAt: new Date("2026-09-11T00:00:00.001Z"),
        },
        "UTC",
      ),
    ).toBe(false);
  });

  it("rejects a backfill logged days later", () => {
    expect(
      countsForStreak(
        {
          tradeDate: "2026-09-09",
          loggedAt: new Date("2026-09-20T09:00:00Z"),
        },
        "UTC",
      ),
    ).toBe(false);
  });

  it("opens the window at midnight in the user's own timezone", () => {
    // New York's 09-09 began at 04:00 UTC, so its window runs until 04:00 UTC
    // on 09-11 — an hour longer than the same date in UTC.
    const entry: StreakEntry = {
      tradeDate: "2026-09-09",
      loggedAt: new Date("2026-09-11T03:00:00Z"),
    };

    expect(countsForStreak(entry, "America/New_York")).toBe(true);
    expect(countsForStreak(entry, "UTC")).toBe(false);
  });

  it("closes it earlier for a timezone ahead of UTC", () => {
    // Tokyo's 09-09 began at 15:00 UTC on 09-08, so the window is already
    // shut when the same instant reaches a UTC journal.
    const entry: StreakEntry = {
      tradeDate: "2026-09-09",
      loggedAt: new Date("2026-09-10T16:00:00Z"),
    };

    expect(countsForStreak(entry, "Asia/Tokyo")).toBe(false);
    expect(countsForStreak(entry, "UTC")).toBe(true);
  });

  it("measures 48 real hours across a daylight-saving switch", () => {
    // Berlin falls back in the night of 2026-10-25. Midnight on 10-24 is
    // 22:00 UTC on 10-23, so the deadline is 22:00 UTC on 10-25 — 23:00 local
    // by then, not local midnight. 48h is a duration, not two calendar days.
    const deadline = "2026-10-25T22:00:00Z";

    expect(
      countsForStreak(
        { tradeDate: "2026-10-24", loggedAt: new Date(deadline) },
        "Europe/Berlin",
      ),
    ).toBe(true);
    expect(
      countsForStreak(
        {
          tradeDate: "2026-10-24",
          loggedAt: new Date("2026-10-25T22:00:00.001Z"),
        },
        "Europe/Berlin",
      ),
    ).toBe(false);
  });
});

describe("calculateStreak", () => {
  it("returns zero for no entries", () => {
    expect(calculateStreak([], "2026-09-11", "UTC")).toEqual({
      current: 0,
      longest: 0,
      graceDayUsed: false,
      graceDayDate: null,
    });
  });

  it("counts a full week logged on the day", () => {
    const result = calculateStreak(
      loggedDays([
        "2026-09-07",
        "2026-09-08",
        "2026-09-09",
        "2026-09-10",
        "2026-09-11",
      ]),
      "2026-09-11",
      "UTC",
    );

    expect(result.current).toBe(5);
    expect(result.longest).toBe(5);
    expect(result.graceDayUsed).toBe(false);
  });

  it("counts a day once, however many entries it holds", () => {
    const result = calculateStreak(
      [sameDay("2026-09-09"), sameDay("2026-09-09"), sameDay("2026-09-10")],
      "2026-09-10",
      "UTC",
    );

    expect(result.current).toBe(2);
  });

  it("builds no streak from backfills, however many", () => {
    const backfilled = [
      "2026-09-07",
      "2026-09-08",
      "2026-09-09",
      "2026-09-10",
    ].map((tradeDate) => ({
      tradeDate,
      loggedAt: new Date("2026-09-20T09:00:00Z"),
    }));

    expect(calculateStreak(backfilled, "2026-09-10", "UTC")).toEqual({
      current: 0,
      longest: 0,
      graceDayUsed: false,
      graceDayDate: null,
    });
  });

  it("skips Saturday: Friday and Monday are consecutive", () => {
    const result = calculateStreak(
      loggedDays(["2026-09-11", "2026-09-14"]),
      "2026-09-14",
      "UTC",
    );

    expect(result.current).toBe(2);
    expect(result.graceDayUsed).toBe(false);
  });

  it("folds a Sunday-dated trade onto Monday", () => {
    const result = calculateStreak(
      [sameDay("2026-09-11"), sameDay("2026-09-13")],
      "2026-09-14",
      "UTC",
    );

    expect(result.current).toBe(2);
    expect(result.graceDayUsed).toBe(false);
  });

  it("credits a Sunday-dated trade before its Monday has arrived", () => {
    const result = calculateStreak(
      [sameDay("2026-09-13")],
      "2026-09-13",
      "UTC",
    );

    expect(result.current).toBe(1);
  });

  it("spends the grace day on the first missed weekday of a month", () => {
    const result = calculateStreak(
      loggedDays(["2026-09-07", "2026-09-08", "2026-09-10"]),
      "2026-09-10",
      "UTC",
    );

    expect(result.current).toBe(3);
    expect(result.graceDayUsed).toBe(true);
    expect(result.graceDayDate).toBe("2026-09-09");
  });

  it("breaks on the second missed weekday of the same month", () => {
    const result = calculateStreak(
      loggedDays(["2026-09-07", "2026-09-08", "2026-09-11"]),
      "2026-09-11",
      "UTC",
    );

    expect(result.current).toBe(1);
    expect(result.longest).toBe(2);
    expect(result.graceDayUsed).toBe(true);
    expect(result.graceDayDate).toBe("2026-09-09");
  });

  it("gives every calendar month its own grace day", () => {
    const result = calculateStreak(
      loggedDays(["2026-09-28", "2026-09-29", "2026-10-02", "2026-10-05"]),
      "2026-10-05",
      "UTC",
    );

    // 09-30 spends September's grace day, 10-01 spends October's.
    expect(result.current).toBe(4);
    expect(result.graceDayUsed).toBe(true);
    expect(result.graceDayDate).toBe("2026-10-01");
  });

  it("reports no grace day for the current month when it was spent earlier", () => {
    const result = calculateStreak(
      loggedDays(["2026-09-28", "2026-09-29", "2026-10-01", "2026-10-02"]),
      "2026-10-02",
      "UTC",
    );

    // Only 09-30 is missing, so September's grace day carried the streak.
    expect(result.current).toBe(4);
    expect(result.graceDayUsed).toBe(false);
    expect(result.graceDayDate).toBeNull();
  });

  it("never counts today against the user", () => {
    const result = calculateStreak(
      loggedDays(["2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10"]),
      "2026-09-11",
      "UTC",
    );

    expect(result.current).toBe(4);
    expect(result.graceDayUsed).toBe(false);
  });

  it("keeps the longest streak after the current one breaks", () => {
    const result = calculateStreak(
      loggedDays([
        "2026-09-07",
        "2026-09-08",
        "2026-09-09",
        "2026-09-10",
        "2026-09-11",
        "2026-09-16",
      ]),
      "2026-09-16",
      "UTC",
    );

    // 09-14 spends the grace day, 09-15 breaks the run of five.
    expect(result.longest).toBe(5);
    expect(result.current).toBe(1);
  });

  it("drops a Saturday-dated entry instead of counting it", () => {
    const result = calculateStreak(
      [sameDay("2026-09-11"), sameDay("2026-09-12")],
      "2026-09-12",
      "UTC",
    );

    expect(result.current).toBe(1);
  });

  it("lets the user's timezone decide whether a day still counts", () => {
    // One entry per weekday, but Wednesday's was logged 03:00 UTC on 09-11.
    // In New York that is inside its 48h window, in UTC it is not — the same
    // data is a clean run of five or a run of four that had to spend the
    // month's grace day.
    const entries: StreakEntry[] = [
      { tradeDate: "2026-09-07", loggedAt: new Date("2026-09-07T18:00:00Z") },
      { tradeDate: "2026-09-08", loggedAt: new Date("2026-09-08T18:00:00Z") },
      { tradeDate: "2026-09-09", loggedAt: new Date("2026-09-11T03:00:00Z") },
      { tradeDate: "2026-09-10", loggedAt: new Date("2026-09-10T18:00:00Z") },
      { tradeDate: "2026-09-11", loggedAt: new Date("2026-09-11T18:00:00Z") },
    ];

    const newYork = calculateStreak(entries, "2026-09-11", "America/New_York");
    const utc = calculateStreak(entries, "2026-09-11", "UTC");

    expect(newYork.current).toBe(5);
    expect(newYork.graceDayUsed).toBe(false);
    expect(utc.current).toBe(4);
    expect(utc.graceDayUsed).toBe(true);
    expect(utc.graceDayDate).toBe("2026-09-09");
  });
});

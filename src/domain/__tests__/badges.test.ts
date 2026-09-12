import { describe, expect, it } from "vitest";
import {
  BADGE_DEFINITIONS,
  type BadgeProgress,
  earnedBadges,
  hasFullLoggedWeek,
} from "../badges.ts";

const nothing: BadgeProgress = {
  entriesLogged: 0,
  reviewsWritten: 0,
  loggedTradingDays: [],
  longestStreak: 0,
  byTheBookTrades: 0,
  bestMonthlyScore: 0,
};

function keysFor(progress: Partial<BadgeProgress>): string[] {
  return earnedBadges({ ...nothing, ...progress }).map((badge) => badge.key);
}

describe("BADGE_DEFINITIONS", () => {
  it("holds twelve badges", () => {
    expect(BADGE_DEFINITIONS).toHaveLength(12);
  });

  it("spreads them over the four categories", () => {
    const perCategory = new Map<string, number>();
    for (const badge of BADGE_DEFINITIONS) {
      perCategory.set(
        badge.category,
        (perCategory.get(badge.category) ?? 0) + 1,
      );
    }

    expect(Object.fromEntries(perCategory)).toEqual({
      "Getting started": 3,
      Volume: 4,
      Streaks: 3,
      Craft: 2,
    });
  });

  it("keeps every key unique", () => {
    const keys = BADGE_DEFINITIONS.map((badge) => badge.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives every badge a title and a description", () => {
    for (const badge of BADGE_DEFINITIONS) {
      expect(badge.title.length).toBeGreaterThan(0);
      expect(badge.description.length).toBeGreaterThan(0);
    }
  });
});

describe("hasFullLoggedWeek", () => {
  it("accepts Monday to Friday of one week", () => {
    expect(
      hasFullLoggedWeek([
        "2026-09-07",
        "2026-09-08",
        "2026-09-09",
        "2026-09-10",
        "2026-09-11",
      ]),
    ).toBe(true);
  });

  it("rejects four days of that week", () => {
    expect(
      hasFullLoggedWeek([
        "2026-09-07",
        "2026-09-08",
        "2026-09-09",
        "2026-09-10",
      ]),
    ).toBe(false);
  });

  it("rejects five days spread over two weeks", () => {
    expect(
      hasFullLoggedWeek([
        "2026-09-08",
        "2026-09-09",
        "2026-09-10",
        "2026-09-11",
        "2026-09-14",
      ]),
    ).toBe(false);
  });

  it("ignores a repeated day", () => {
    expect(
      hasFullLoggedWeek([
        "2026-09-07",
        "2026-09-07",
        "2026-09-08",
        "2026-09-09",
        "2026-09-10",
      ]),
    ).toBe(false);
  });
});

describe("earnedBadges", () => {
  it("awards nothing to an empty journal", () => {
    expect(earnedBadges(nothing)).toEqual([]);
  });

  describe("Getting started", () => {
    it("awards first_entry on the first entry", () => {
      expect(keysFor({ entriesLogged: 1 })).toContain("first_entry");
    });

    it("awards first_review on the first end-of-day review", () => {
      expect(keysFor({ reviewsWritten: 0 })).not.toContain("first_review");
      expect(keysFor({ reviewsWritten: 1 })).toContain("first_review");
    });

    it("awards full_week for a complete trading week", () => {
      const week = [
        "2026-09-07",
        "2026-09-08",
        "2026-09-09",
        "2026-09-10",
        "2026-09-11",
      ];

      expect(keysFor({ loggedTradingDays: week.slice(0, 4) })).not.toContain(
        "full_week",
      );
      expect(keysFor({ loggedTradingDays: week })).toContain("full_week");
    });
  });

  describe("Volume", () => {
    it("holds back at nine entries", () => {
      expect(keysFor({ entriesLogged: 9 })).not.toContain("logged_10");
    });

    it("awards each threshold as it is reached", () => {
      expect(keysFor({ entriesLogged: 10 })).toContain("logged_10");
      expect(keysFor({ entriesLogged: 250 })).toEqual(
        expect.arrayContaining(["logged_10", "logged_50", "logged_250"]),
      );
      expect(keysFor({ entriesLogged: 250 })).not.toContain("logged_1000");
      expect(keysFor({ entriesLogged: 1000 })).toContain("logged_1000");
    });

    it("counts backfilled entries too, because volume is not a streak", () => {
      // No streak days at all, still ten entries logged.
      expect(keysFor({ entriesLogged: 10, longestStreak: 0 })).toContain(
        "logged_10",
      );
    });
  });

  describe("Streaks", () => {
    it("holds back one day short", () => {
      expect(keysFor({ longestStreak: 6 })).not.toContain("streak_7");
      expect(keysFor({ longestStreak: 29 })).not.toContain("streak_30");
      expect(keysFor({ longestStreak: 99 })).not.toContain("streak_100");
    });

    it("awards each threshold as it is reached", () => {
      expect(keysFor({ longestStreak: 7 })).toEqual(["streak_7"]);
      expect(keysFor({ longestStreak: 100 })).toEqual([
        "streak_7",
        "streak_30",
        "streak_100",
      ]);
    });
  });

  describe("Craft", () => {
    it("awards by_the_book_20 at twenty by-the-book trades", () => {
      expect(keysFor({ byTheBookTrades: 19 })).not.toContain("by_the_book_20");
      expect(keysFor({ byTheBookTrades: 20 })).toContain("by_the_book_20");
    });

    it("awards score_90 at a monthly score of ninety", () => {
      expect(keysFor({ bestMonthlyScore: 89 })).not.toContain("score_90");
      expect(keysFor({ bestMonthlyScore: 90 })).toContain("score_90");
    });
  });

  it("returns the badges in definition order", () => {
    const earned = earnedBadges({
      ...nothing,
      entriesLogged: 10,
      longestStreak: 7,
    });

    expect(earned.map((badge) => badge.key)).toEqual([
      "first_entry",
      "logged_10",
      "streak_7",
    ]);
  });
});

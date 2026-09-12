import { describe, expect, it } from "vitest";
import {
  calculateConsistencyScore,
  type ScoreDay,
  type ScoreEntry,
  tradingDaysElapsed,
} from "../consistency.ts";

// September 2026: 09-01 is a Tuesday, 09-12 a Saturday, 09-13 a Sunday.

const complete: ScoreEntry = {
  taken: true,
  hasNotes: true,
  hasGrade: true,
  hasFelt: true,
  hasConfluence: true,
  hasScreenshotOrLink: true,
  byTheBook: true,
};

const incomplete: ScoreEntry = { ...complete, hasFelt: false };
const missedSetup: ScoreEntry = { ...complete, taken: false, byTheBook: false };

function day(
  date: string,
  entries: ScoreEntry[],
  hasEodReview = true,
): ScoreDay {
  return { date, entries, hasEodReview };
}

describe("tradingDaysElapsed", () => {
  it("stops at today inside the running month", () => {
    const days = tradingDaysElapsed("2026-09", "2026-09-12");

    expect(days).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-07",
      "2026-09-08",
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
    ]);
  });

  it("returns every trading day of a month that is over", () => {
    const days = tradingDaysElapsed("2026-08", "2026-09-12");

    expect(days).toHaveLength(21);
    expect(days[0]).toBe("2026-08-03");
    expect(days[days.length - 1]).toBe("2026-08-31");
  });

  it("returns nothing for a month that has not started", () => {
    expect(tradingDaysElapsed("2026-10", "2026-09-12")).toEqual([]);
  });
});

describe("calculateConsistencyScore", () => {
  it("awards 100 for a single complete, by-the-book, reviewed day", () => {
    const score = calculateConsistencyScore(
      [day("2026-09-01", [complete])],
      "2026-09",
      "2026-09-01",
    );

    expect(score).toEqual({
      score: 100,
      showingUp: 40,
      completeness: 20,
      planAdherence: 25,
      reviewHabit: 15,
    });
  });

  it("scores twenty trades in one day exactly like one", () => {
    const one = calculateConsistencyScore(
      [day("2026-09-01", [complete])],
      "2026-09",
      "2026-09-01",
    );
    const twenty = calculateConsistencyScore(
      [
        day(
          "2026-09-01",
          Array.from({ length: 20 }, () => complete),
        ),
      ],
      "2026-09",
      "2026-09-01",
    );

    expect(twenty).toEqual(one);
  });

  it("returns zero for a month with nothing logged", () => {
    expect(calculateConsistencyScore([], "2026-09", "2026-09-11")).toEqual({
      score: 0,
      showingUp: 0,
      completeness: 0,
      planAdherence: 0,
      reviewHabit: 0,
    });
  });

  describe("showing up", () => {
    it("divides logged days by the trading days elapsed so far", () => {
      // Five of the nine trading days up to 09-11.
      const days = [
        "2026-09-01",
        "2026-09-02",
        "2026-09-03",
        "2026-09-04",
        "2026-09-07",
      ].map((date) => day(date, [complete]));

      const score = calculateConsistencyScore(days, "2026-09", "2026-09-11");

      expect(score.showingUp).toBeCloseTo((5 / 9) * 40, 10);
      expect(score.completeness).toBe(20);
    });

    it("ignores a day outside the scored month", () => {
      const score = calculateConsistencyScore(
        [day("2026-08-31", [complete]), day("2026-09-01", [complete])],
        "2026-09",
        "2026-09-01",
      );

      expect(score.showingUp).toBe(40);
    });

    it("folds a Sunday-dated day onto Monday instead of losing it", () => {
      // 09-13 is a Sunday and belongs to Monday 09-14, the only trading day
      // elapsed by then.
      const score = calculateConsistencyScore(
        [day("2026-09-13", [complete])],
        "2026-09",
        "2026-09-14",
      );

      expect(score.showingUp).toBeCloseTo((1 / 10) * 40, 10);
    });

    it("ignores a Sunday whose Monday has not arrived, unlike the streak", () => {
      // The streak credits this entry straight away (streak.test.ts, "credits
      // a Sunday-dated trade before its Monday has arrived"). The score
      // cannot: its denominator is the days that have elapsed, and Monday is
      // not one of them yet.
      const score = calculateConsistencyScore(
        [day("2026-09-13", [complete])],
        "2026-09",
        "2026-09-13",
      );

      expect(score).toEqual({
        score: 0,
        showingUp: 0,
        completeness: 0,
        planAdherence: 0,
        reviewHabit: 0,
      });
    });

    it("moves a month-end Sunday into the month its Monday belongs to", () => {
      // 2026-05-31 is a Sunday and belongs to Monday 2026-06-01.
      const sunday = [day("2026-05-31", [complete])];

      expect(
        calculateConsistencyScore(sunday, "2026-05", "2026-06-01").showingUp,
      ).toBe(0);
      expect(
        calculateConsistencyScore(sunday, "2026-06", "2026-06-01").showingUp,
      ).toBe(40);
    });
  });

  describe("completeness", () => {
    it("counts an entry only when notes, grade, felt, a confluence and a screenshot or link are all there", () => {
      const score = calculateConsistencyScore(
        [day("2026-09-01", [complete, incomplete])],
        "2026-09",
        "2026-09-01",
      );

      expect(score.completeness).toBe(10);
    });

    it("averages per day before averaging the month", () => {
      // Day one: half complete. Day two: fully complete. Mean 0.75.
      const score = calculateConsistencyScore(
        [
          day("2026-09-01", [complete, incomplete]),
          day("2026-09-02", [complete]),
        ],
        "2026-09",
        "2026-09-02",
      );

      expect(score.completeness).toBe(15);
    });

    it("counts a missed setup like any other entry", () => {
      const score = calculateConsistencyScore(
        [day("2026-09-01", [{ ...missedSetup, hasNotes: false }])],
        "2026-09",
        "2026-09-01",
      );

      expect(score.completeness).toBe(0);
    });
  });

  describe("plan adherence", () => {
    it("takes the share of taken trades flagged by the book", () => {
      const score = calculateConsistencyScore(
        [
          day("2026-09-01", [complete, complete, complete]),
          day("2026-09-02", [complete, { ...complete, byTheBook: false }]),
        ],
        "2026-09",
        "2026-09-02",
      );

      // (1.0 + 0.5) / 2 = 0.75
      expect(score.planAdherence).toBe(18.75);
    });

    it("leaves a day of nothing but missed setups out of the average", () => {
      const score = calculateConsistencyScore(
        [
          day("2026-09-01", [complete, complete, complete]),
          day("2026-09-02", [missedSetup]),
          day("2026-09-03", [complete, { ...complete, byTheBook: false }]),
        ],
        "2026-09",
        "2026-09-03",
      );

      expect(score.planAdherence).toBe(18.75);
    });

    it("awards the full weight when the month holds no taken trade at all", () => {
      const score = calculateConsistencyScore(
        [day("2026-09-01", [missedSetup])],
        "2026-09",
        "2026-09-01",
      );

      expect(score.planAdherence).toBe(25);
    });

    it("ignores by_the_book on a missed setup", () => {
      const score = calculateConsistencyScore(
        [day("2026-09-01", [complete, { ...missedSetup, byTheBook: true }])],
        "2026-09",
        "2026-09-01",
      );

      expect(score.planAdherence).toBe(25);
    });
  });

  describe("review habit", () => {
    it("counts the share of logged days carrying an end-of-day review", () => {
      const score = calculateConsistencyScore(
        [
          day("2026-09-01", [complete], true),
          day("2026-09-02", [complete], false),
        ],
        "2026-09",
        "2026-09-02",
      );

      expect(score.reviewHabit).toBe(7.5);
    });

    it("is a per-day flag, not a per-entry one", () => {
      const score = calculateConsistencyScore(
        [day("2026-09-01", [complete, complete, complete], true)],
        "2026-09",
        "2026-09-01",
      );

      expect(score.reviewHabit).toBe(15);
    });
  });

  it("rounds the total but keeps the parts exact", () => {
    const score = calculateConsistencyScore(
      [
        day("2026-09-01", [complete]),
        day("2026-09-02", [complete, { ...complete, byTheBook: false }], false),
      ],
      "2026-09",
      "2026-09-02",
    );

    expect(score.showingUp).toBe(40);
    expect(score.completeness).toBe(20);
    expect(score.planAdherence).toBe(18.75);
    expect(score.reviewHabit).toBe(7.5);
    expect(score.score).toBe(86);
  });
});

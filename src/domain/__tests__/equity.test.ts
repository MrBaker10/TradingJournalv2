import { describe, expect, it } from "vitest";
import { buildEquitySeries, type EquityDay } from "../equity.ts";

function days(...amounts: [string, number][]): EquityDay[] {
  return amounts.map(([date, amountCents]) => ({ date, amountCents }));
}

describe("buildEquitySeries", () => {
  describe("the running sum", () => {
    it("accumulates the daily totals from zero", () => {
      const series = buildEquitySeries(
        days(
          ["2026-09-01", 31000],
          ["2026-09-02", -30000],
          ["2026-09-03", 22000],
        ),
      );

      expect(series.points.map((point) => point.equityCents)).toEqual([
        31000, 1000, 23000,
      ]);
    });

    it("keeps each day's own total beside the running one", () => {
      const series = buildEquitySeries(
        days(["2026-09-01", 31000], ["2026-09-02", -30000]),
      );

      expect(series.points).toEqual([
        { date: "2026-09-01", amountCents: 31000, equityCents: 31000 },
        { date: "2026-09-02", amountCents: -30000, equityCents: 1000 },
      ]);
    });

    it("ends on the month's net P&L", () => {
      const input = days(
        ["2026-09-01", 12345],
        ["2026-09-04", -9876],
        ["2026-09-07", 501],
      );
      const net = input.reduce((sum, day) => sum + day.amountCents, 0);

      const series = buildEquitySeries(input);

      expect(series.points.at(-1)?.equityCents).toBe(net);
    });

    it("sorts the days before summing", () => {
      const series = buildEquitySeries(
        days(
          ["2026-09-03", 22000],
          ["2026-09-01", 31000],
          ["2026-09-02", -30000],
        ),
      );

      expect(series.points.map((point) => point.date)).toEqual([
        "2026-09-01",
        "2026-09-02",
        "2026-09-03",
      ]);
      expect(series.points.map((point) => point.equityCents)).toEqual([
        31000, 1000, 23000,
      ]);
    });

    it("does not mutate the input", () => {
      const input = days(["2026-09-03", 22000], ["2026-09-01", 31000]);

      buildEquitySeries(input);

      expect(input[0].date).toBe("2026-09-03");
    });

    it("stays on whole cents", () => {
      const series = buildEquitySeries(
        days(["2026-09-01", 1], ["2026-09-02", 1], ["2026-09-03", 1]),
      );

      expect(series.points.map((point) => point.equityCents)).toEqual([
        1, 2, 3,
      ]);
    });

    it("plots a day of missed setups as a flat point, not a gap", () => {
      const series = buildEquitySeries(
        days(["2026-09-01", 31000], ["2026-09-02", 0], ["2026-09-03", 5000]),
      );

      expect(series.points.map((point) => point.equityCents)).toEqual([
        31000, 31000, 36000,
      ]);
    });

    it("returns no points for a month with no entries", () => {
      expect(buildEquitySeries([]).points).toEqual([]);
    });
  });

  describe("the axis", () => {
    it("spans zero even when the month only ever rose", () => {
      const series = buildEquitySeries(
        days(["2026-09-01", 31000], ["2026-09-02", 9000]),
      );

      const [min, max] = series.domainCents;
      expect(min).toBe(0);
      expect(max).toBeGreaterThanOrEqual(40000);
      expect(series.zeroOffset).toBe(1);
    });

    it("spans zero even when the month only ever fell", () => {
      const series = buildEquitySeries(
        days(["2026-09-01", -31000], ["2026-09-02", -9000]),
      );

      const [min, max] = series.domainCents;
      expect(max).toBe(0);
      expect(min).toBeLessThanOrEqual(-40000);
      expect(series.zeroOffset).toBe(0);
    });

    it("puts the zero crossing between the edges when the month crossed", () => {
      const series = buildEquitySeries(
        days(["2026-09-01", 40000], ["2026-09-02", -80000]),
      );

      expect(series.zeroOffset).toBeGreaterThan(0);
      expect(series.zeroOffset).toBeLessThan(1);
    });

    it("reads the zero crossing straight off the domain", () => {
      const series = buildEquitySeries(
        days(["2026-09-01", 40000], ["2026-09-02", -80000]),
      );

      const [min, max] = series.domainCents;
      expect(series.zeroOffset).toBeCloseTo(max / (max - min), 10);
    });

    it("gives a flat month a real axis instead of [0, 0]", () => {
      const series = buildEquitySeries(
        days(["2026-09-01", 0], ["2026-09-02", 0]),
      );

      const [min, max] = series.domainCents;
      expect(min).toBeLessThan(0);
      expect(max).toBeGreaterThan(0);
      expect(series.zeroOffset).toBe(0.5);
    });

    it("gives an empty month a real axis too", () => {
      const [min, max] = buildEquitySeries([]).domainCents;

      expect(max - min).toBeGreaterThan(0);
    });

    it("keeps the whole curve inside the domain", () => {
      const series = buildEquitySeries(
        days(
          ["2026-09-01", 31234],
          ["2026-09-02", -78901],
          ["2026-09-03", 12000],
        ),
      );

      const [min, max] = series.domainCents;
      for (const point of series.points) {
        expect(point.equityCents).toBeGreaterThanOrEqual(min);
        expect(point.equityCents).toBeLessThanOrEqual(max);
      }
    });

    it("rounds the domain to round money", () => {
      const series = buildEquitySeries(
        days(["2026-09-01", 31234], ["2026-09-02", -78901]),
      );

      const [min, max] = series.domainCents;
      expect(Number.isInteger(min)).toBe(true);
      expect(Number.isInteger(max)).toBe(true);
      // % on a negative multiple returns -0, which Object.is separates from 0.
      expect(Math.abs(min % 100)).toBe(0);
      expect(Math.abs(max % 100)).toBe(0);
    });
  });

  describe("the ticks", () => {
    it("run from the bottom of the domain to the top, evenly spaced", () => {
      const series = buildEquitySeries(
        days(["2026-09-01", 40000], ["2026-09-02", -80000]),
      );

      const [min, max] = series.domainCents;
      expect(series.ticksCents.at(0)).toBe(min);
      expect(series.ticksCents.at(-1)).toBe(max);

      const gaps = series.ticksCents
        .slice(1)
        .map((tick, index) => tick - series.ticksCents[index]);
      expect(new Set(gaps).size).toBe(1);
    });

    it("always includes the zero line", () => {
      const cases: EquityDay[][] = [
        days(["2026-09-01", 31234]),
        days(["2026-09-01", -78901]),
        days(["2026-09-01", 40000], ["2026-09-02", -80000]),
        days(["2026-09-01", 0]),
        [],
      ];

      for (const input of cases) {
        expect(buildEquitySeries(input).ticksCents).toContain(0);
      }
    });

    it("stays readable on a small month and on a large one", () => {
      const small = buildEquitySeries(days(["2026-09-01", 2500]));
      const large = buildEquitySeries(days(["2026-09-01", 125000000]));

      expect(small.ticksCents.length).toBeGreaterThanOrEqual(3);
      expect(small.ticksCents.length).toBeLessThanOrEqual(7);
      expect(large.ticksCents.length).toBeGreaterThanOrEqual(3);
      expect(large.ticksCents.length).toBeLessThanOrEqual(7);
    });
  });
});

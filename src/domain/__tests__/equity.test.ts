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

    it("ends on the net P&L of the whole stretch", () => {
      const input = days(
        ["2026-09-01", 12345],
        ["2026-09-04", -9876],
        ["2026-09-07", 501],
      );
      const net = input.reduce((sum, day) => sum + day.amountCents, 0);

      const series = buildEquitySeries(input);

      expect(series.points.at(-1)?.equityCents).toBe(net);
    });

    it("carries the sum across a month boundary", () => {
      // The dashboard passes the whole history, so the accumulator must not
      // reset anywhere: August has to still be in the September figures.
      const series = buildEquitySeries(
        days(
          ["2026-08-20", 40000],
          ["2026-08-28", -15000],
          ["2026-09-03", 20000],
        ),
      );

      expect(series.points.map((point) => point.equityCents)).toEqual([
        40000, 25000, 45000,
      ]);
    });

    it("keeps the axis readable over a stretch of many months", () => {
      const series = buildEquitySeries(
        Array.from({ length: 14 }, (_, index) => ({
          date: `2026-${String((index % 12) + 1).padStart(2, "0")}-0${(index % 9) + 1}`,
          amountCents: index % 2 === 0 ? 25000 : -10000,
        })),
      );

      expect(series.ticksCents.length).toBeGreaterThanOrEqual(3);
      expect(series.ticksCents.length).toBeLessThanOrEqual(7);
      expect(series.domainCents[0]).toBeLessThanOrEqual(0);
      expect(series.domainCents[1]).toBeGreaterThanOrEqual(0);
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

    it("returns no points when there are no entries", () => {
      expect(buildEquitySeries([]).points).toEqual([]);
    });
  });

  describe("the axis", () => {
    it("spans zero even when the curve only ever rose", () => {
      const series = buildEquitySeries(
        days(["2026-09-01", 31000], ["2026-09-02", 9000]),
      );

      const [min, max] = series.domainCents;
      expect(min).toBe(0);
      expect(max).toBeGreaterThanOrEqual(40000);
      expect(series.baselineOffset).toBe(1);
    });

    it("spans zero even when the month only ever fell", () => {
      const series = buildEquitySeries(
        days(["2026-09-01", -31000], ["2026-09-02", -9000]),
      );

      const [min, max] = series.domainCents;
      expect(max).toBe(0);
      expect(min).toBeLessThanOrEqual(-40000);
      expect(series.baselineOffset).toBe(0);
    });

    it("puts the zero crossing between the edges when the month crossed", () => {
      const series = buildEquitySeries(
        days(["2026-09-01", 40000], ["2026-09-02", -80000]),
      );

      expect(series.baselineOffset).toBeGreaterThan(0);
      expect(series.baselineOffset).toBeLessThan(1);
    });

    it("reads the zero crossing straight off the domain", () => {
      const series = buildEquitySeries(
        days(["2026-09-01", 40000], ["2026-09-02", -80000]),
      );

      const [min, max] = series.domainCents;
      expect(series.baselineOffset).toBeCloseTo(max / (max - min), 10);
    });

    it("gives a flat month a real axis instead of [0, 0]", () => {
      const series = buildEquitySeries(
        days(["2026-09-01", 0], ["2026-09-02", 0]),
      );

      const [min, max] = series.domainCents;
      expect(min).toBeLessThan(0);
      expect(max).toBeGreaterThan(0);
      expect(series.baselineOffset).toBe(0.5);
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

describe("the month marks", () => {
  it("names the first traded day of each month", () => {
    const series = buildEquitySeries(
      days(
        ["2026-08-20", 1],
        ["2026-08-28", 1],
        ["2026-09-03", 1],
        ["2026-09-04", 1],
        ["2026-10-01", 1],
      ),
    );

    // One mark per month, not one per point: the axis would otherwise print
    // "Aug 2026" for every August day it draws.
    expect(series.monthTicks).toEqual([
      "2026-08-20",
      "2026-09-03",
      "2026-10-01",
    ]);
  });

  it("gives a single-month series one mark", () => {
    // One entry is how the chart knows it may use day marks instead.
    const series = buildEquitySeries(
      days(["2026-09-03", 1], ["2026-09-04", 1], ["2026-09-30", 1]),
    );

    expect(series.monthTicks).toEqual(["2026-09-03"]);
  });

  it("crosses a year boundary without merging December into January", () => {
    const series = buildEquitySeries(
      days(["2026-12-28", 1], ["2027-01-04", 1]),
    );

    expect(series.monthTicks).toEqual(["2026-12-28", "2027-01-04"]);
  });

  it("has no marks without points", () => {
    expect(buildEquitySeries([]).monthTicks).toEqual([]);
  });

  it("picks a date that is really on the curve", () => {
    // The mark sits on a plotted point, so the chart never interpolates a
    // position for it.
    const series = buildEquitySeries(
      days(["2026-08-20", 1], ["2026-09-17", 1]),
    );
    const plotted = new Set(series.points.map((point) => point.date));

    for (const tick of series.monthTicks) {
      expect(plotted.has(tick)).toBe(true);
    }
  });
});

describe("buildEquitySeries — starting balance", () => {
  const START = 5_000_000; // $50,000

  it("starts the running sum at the balance", () => {
    const series = buildEquitySeries(
      days(["2026-09-01", 31000], ["2026-09-02", -30000]),
      START,
    );

    expect(series.startCents).toBe(START);
    expect(series.points.map((point) => point.equityCents)).toEqual([
      5_031_000, 5_001_000,
    ]);
    // A day's own total is not touched by the balance.
    expect(series.points.map((point) => point.amountCents)).toEqual([
      31000, -30000,
    ]);
  });

  it("keeps the start in the domain instead of zero", () => {
    const rising = buildEquitySeries(
      days(["2026-09-01", 31000], ["2026-09-02", 9000]),
      START,
    );
    const [min, max] = rising.domainCents;
    expect(min).toBe(START);
    expect(max).toBeGreaterThanOrEqual(START + 40000);
    // Zero is far below and has no business on this axis.
    expect(min).toBeGreaterThan(0);
    expect(rising.baselineOffset).toBe(1);
  });

  it("puts the starting line at the bottom edge of a curve that only fell", () => {
    const series = buildEquitySeries(
      days(["2026-09-01", -31000], ["2026-09-02", -9000]),
      START,
    );
    expect(series.domainCents[1]).toBe(START);
    expect(series.baselineOffset).toBe(0);
  });

  it("reads the starting line straight off the domain", () => {
    const series = buildEquitySeries(
      days(["2026-09-01", 40000], ["2026-09-02", -80000]),
      START,
    );
    const [min, max] = series.domainCents;
    expect(series.baselineOffset).toBeCloseTo((max - START) / (max - min), 10);
    expect(series.baselineOffset).toBeGreaterThan(0);
    expect(series.baselineOffset).toBeLessThan(1);
  });

  it("keeps the ticks on round amounts around the start", () => {
    const series = buildEquitySeries(
      days(["2026-09-01", 40000], ["2026-09-02", -80000]),
      START,
    );
    const step = series.ticksCents[1] - series.ticksCents[0];
    expect(series.ticksCents).toContain(START);
    for (const tick of series.ticksCents) expect(tick % step).toBe(0);
  });

  it("gives a flat curve at an uneven start a real axis", () => {
    const series = buildEquitySeries(
      days(["2026-09-01", 0], ["2026-09-02", 0]),
      5_012_345,
    );
    const [min, max] = series.domainCents;
    expect(min).toBeLessThan(5_012_345);
    expect(max).toBeGreaterThan(5_012_345);
    expect(series.baselineOffset).toBeGreaterThan(0);
    expect(series.baselineOffset).toBeLessThan(1);
  });

  it("is exactly today's series without a balance", () => {
    const input = days(
      ["2026-09-01", 40000],
      ["2026-09-02", -80000],
      ["2026-09-03", 12345],
    );
    expect(buildEquitySeries(input, 0)).toEqual(buildEquitySeries(input));
    expect(buildEquitySeries(input).startCents).toBe(0);
  });

  it("rejects a balance that is not whole cents", () => {
    expect(() => buildEquitySeries([], 100.5)).toThrow(RangeError);
  });
});

describe("the start point", () => {
  it("opens the plotted curve at the starting balance, then moves with the first day", () => {
    const series = buildEquitySeries(
      days(["2026-09-03", 40_000], ["2026-09-04", -15_000]),
      2_500_000,
    );
    expect(
      series.plotted.map((point) => [point.key, point.equityCents]),
    ).toEqual([
      ["start", 2_500_000],
      ["2026-09-03", 2_540_000],
      ["2026-09-04", 2_525_000],
    ]);
    expect(series.plotted[0]).toMatchObject({
      kind: "start",
      date: null,
      amountCents: 0,
    });
  });

  it("starts at zero without a starting balance", () => {
    const series = buildEquitySeries(days(["2026-09-03", -12_345]));
    expect(series.plotted[0].equityCents).toBe(0);
    expect(series.plotted[1].equityCents).toBe(-12_345);
  });

  it("plots nothing without days — a start alone is not a curve", () => {
    expect(buildEquitySeries([], 2_500_000).plotted).toEqual([]);
  });

  it("keeps points to one per day, so month marks never see the start", () => {
    const series = buildEquitySeries(days(["2026-09-03", 100]), 2_500_000);
    expect(series.points).toHaveLength(1);
    expect(series.monthTicks).toEqual(["2026-09-03"]);
  });

  it("ends where the net result of the whole stretch says", () => {
    const series = buildEquitySeries(
      days(["2026-08-28", 10_000], ["2026-09-03", -2_500]),
      2_500_000,
    );
    const last = series.plotted[series.plotted.length - 1];
    expect(last.equityCents - series.startCents).toBe(7_500);
  });
});

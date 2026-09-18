import { describe, expect, it } from "vitest";
import {
  buildDimensionRows,
  buildMissedRows,
  DIMENSION_IDS,
  type DimensionAggregateRow,
  type DimensionId,
  formatBucketLabel,
  groupByDimension,
  groupMissedByDimension,
  MISSED_DIMENSION_IDS,
  type MissedAggregateRow,
  NOT_SET_LABEL,
} from "../analytics.ts";

function aggregate(
  overrides: Partial<DimensionAggregateRow> & { bucket: string | null },
): DimensionAggregateRow {
  return {
    dimension: "setupType",
    trades: 1,
    wins: 0,
    netPnlCents: 0,
    rSum: null,
    rCount: 0,
    ...overrides,
  };
}

function missed(
  overrides: Partial<MissedAggregateRow> & { bucket: string | null },
): MissedAggregateRow {
  return {
    dimension: "setupType",
    missed: 0,
    entries: 0,
    ...overrides,
  };
}

describe("formatBucketLabel", () => {
  it("prints a null bucket as Not set", () => {
    expect(formatBucketLabel("setupType", null)).toBe(NOT_SET_LABEL);
    expect(formatBucketLabel("weekday", null)).toBe(NOT_SET_LABEL);
  });

  it("passes a text bucket through untouched", () => {
    expect(formatBucketLabel("setupType", "Break & Retest")).toBe(
      "Break & Retest",
    );
    expect(formatBucketLabel("instrument", "MNQ")).toBe("MNQ");
  });

  // Postgres extract(dow ...) counts Sunday as 0. Sunday stays Sunday here:
  // the Sunday-lands-on-Monday rule belongs to the streak, not to the
  // question of when the user actually trades.
  it("turns a Postgres day-of-week number into its weekday", () => {
    expect(formatBucketLabel("weekday", "0")).toBe("Sunday");
    expect(formatBucketLabel("weekday", "1")).toBe("Monday");
    expect(formatBucketLabel("weekday", "5")).toBe("Friday");
    expect(formatBucketLabel("weekday", "6")).toBe("Saturday");
  });

  it("prints an hour as a padded chart-clock time", () => {
    expect(formatBucketLabel("hour", "0")).toBe("00:00");
    expect(formatBucketLabel("hour", "9")).toBe("09:00");
    expect(formatBucketLabel("hour", "23")).toBe("23:00");
  });

  it("prints an out-of-range number as it arrived rather than inventing one", () => {
    expect(formatBucketLabel("hour", "24")).toBe("24");
    expect(formatBucketLabel("hour", "-1")).toBe("-1");
    expect(formatBucketLabel("weekday", "9")).toBe("9");
  });
});

describe("buildDimensionRows", () => {
  describe("the two ratios", () => {
    it("derives win rate from wins over trades", () => {
      const [row] = buildDimensionRows("setupType", [
        aggregate({ bucket: "Reversal", trades: 4, wins: 3 }),
      ]);

      expect(row.winRate).toBe(0.75);
    });

    it("has no win rate for a bucket without trades", () => {
      const [row] = buildDimensionRows("setupType", [
        aggregate({ bucket: "Reversal", trades: 0, wins: 0 }),
      ]);

      expect(row.winRate).toBeNull();
    });

    it("averages R over the trades that had one, not over all of them", () => {
      // Five trades, only two with a stop price to measure R against.
      const [row] = buildDimensionRows("setupType", [
        aggregate({ bucket: "Reversal", trades: 5, rSum: 3, rCount: 2 }),
      ]);

      expect(row.avgR).toBe(1.5);
    });

    it("has no avg R when no trade in the bucket carried one", () => {
      const [row] = buildDimensionRows("setupType", [
        aggregate({ bucket: "Reversal", trades: 5, rSum: null, rCount: 0 }),
      ]);

      expect(row.avgR).toBeNull();
    });
  });

  describe("money", () => {
    it("passes integer cents through untouched", () => {
      const [row] = buildDimensionRows("setupType", [
        aggregate({ bucket: "Reversal", netPnlCents: -123456 }),
      ]);

      expect(row.netPnlCents).toBe(-123456);
    });
  });

  describe("the bar", () => {
    it("scales against the largest absolute net P&L of the dimension", () => {
      const rows = buildDimensionRows("setupType", [
        aggregate({ bucket: "A", netPnlCents: 10000 }),
        aggregate({ bucket: "B", netPnlCents: 5000 }),
        aggregate({ bucket: "C", netPnlCents: -20000 }),
      ]);

      const ratios = Object.fromEntries(
        rows.map((row) => [row.label, row.barRatio]),
      );
      expect(ratios.C).toBe(1);
      expect(ratios.A).toBe(0.5);
      expect(ratios.B).toBe(0.25);
    });

    it("draws no bar at all when every bucket nets zero", () => {
      const rows = buildDimensionRows("setupType", [
        aggregate({ bucket: "A", netPnlCents: 0 }),
        aggregate({ bucket: "B", netPnlCents: 0 }),
      ]);

      expect(rows.map((row) => row.barRatio)).toEqual([0, 0]);
    });
  });

  describe("order", () => {
    it("sorts by net P&L, best first", () => {
      const rows = buildDimensionRows("setupType", [
        aggregate({ bucket: "B", netPnlCents: 1000 }),
        aggregate({ bucket: "C", netPnlCents: -4000 }),
        aggregate({ bucket: "A", netPnlCents: 9000 }),
      ]);

      expect(rows.map((row) => row.label)).toEqual(["A", "B", "C"]);
    });

    it("puts Not set last however well it did", () => {
      const rows = buildDimensionRows("setupType", [
        aggregate({ bucket: "A", netPnlCents: 1000 }),
        aggregate({ bucket: null, netPnlCents: 999999 }),
        aggregate({ bucket: "B", netPnlCents: -1000 }),
      ]);

      expect(rows.map((row) => row.label)).toEqual(["A", "B", NOT_SET_LABEL]);
    });

    it("breaks a P&L tie by trade count, then by label", () => {
      const rows = buildDimensionRows("setupType", [
        aggregate({ bucket: "B", netPnlCents: 0, trades: 2 }),
        aggregate({ bucket: "A", netPnlCents: 0, trades: 2 }),
        aggregate({ bucket: "C", netPnlCents: 0, trades: 9 }),
      ]);

      expect(rows.map((row) => row.label)).toEqual(["C", "A", "B"]);
    });
  });

  it("keeps a bucket whose trades all lost, rather than dropping it", () => {
    const rows = buildDimensionRows("setupType", [
      aggregate({ bucket: "Reversal", trades: 3, wins: 0, netPnlCents: -5000 }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].winRate).toBe(0);
  });

  it("labels the buckets with its own dimension", () => {
    const rows = buildDimensionRows("weekday", [
      aggregate({ dimension: "weekday", bucket: "3", netPnlCents: 100 }),
    ]);

    expect(rows[0].label).toBe("Wednesday");
  });
});

describe("groupByDimension", () => {
  it("splits one result set into all eleven dimensions", () => {
    const grouped = groupByDimension([
      aggregate({ dimension: "session", bucket: "NY-AM", netPnlCents: 500 }),
      aggregate({ dimension: "setupType", bucket: "Reversal" }),
    ]);

    expect(Object.keys(grouped)).toEqual(DIMENSION_IDS);
    expect(grouped.session.map((row) => row.label)).toEqual(["NY-AM"]);
    expect(grouped.setupType.map((row) => row.label)).toEqual(["Reversal"]);
  });

  it("gives a dimension with no rows an empty list, not a missing key", () => {
    const grouped = groupByDimension([]);

    for (const dimension of DIMENSION_IDS) {
      expect(grouped[dimension as DimensionId]).toEqual([]);
    }
  });

  it("scales each dimension's bars against its own largest value", () => {
    const grouped = groupByDimension([
      aggregate({ dimension: "session", bucket: "NY-AM", netPnlCents: 100 }),
      aggregate({
        dimension: "setupType",
        bucket: "Reversal",
        netPnlCents: 900,
      }),
    ]);

    expect(grouped.session[0].barRatio).toBe(1);
    expect(grouped.setupType[0].barRatio).toBe(1);
  });
});

describe("buildMissedRows", () => {
  it("derives the share from missed over all entries of the bucket", () => {
    const [row] = buildMissedRows("session", [
      missed({
        dimension: "session",
        bucket: "London",
        missed: 3,
        entries: 12,
      }),
    ]);

    expect(row.share).toBe(0.25);
    expect(row.missed).toBe(3);
    expect(row.entries).toBe(12);
  });

  it("drops a bucket with nothing missed", () => {
    const rows = buildMissedRows("session", [
      missed({ dimension: "session", bucket: "London", missed: 2, entries: 4 }),
      missed({ dimension: "session", bucket: "Asia", missed: 0, entries: 7 }),
    ]);

    expect(rows.map((row) => row.label)).toEqual(["London"]);
  });

  it("sorts by count, most missed first, with Not set last", () => {
    const rows = buildMissedRows("session", [
      missed({ dimension: "session", bucket: null, missed: 99, entries: 99 }),
      missed({ dimension: "session", bucket: "Asia", missed: 1, entries: 4 }),
      missed({ dimension: "session", bucket: "London", missed: 5, entries: 8 }),
    ]);

    expect(rows.map((row) => row.label)).toEqual([
      "London",
      "Asia",
      NOT_SET_LABEL,
    ]);
  });

  it("scales the bar against the largest missed count", () => {
    const rows = buildMissedRows("session", [
      missed({ dimension: "session", bucket: "London", missed: 4, entries: 8 }),
      missed({ dimension: "session", bucket: "Asia", missed: 1, entries: 4 }),
    ]);

    expect(rows.map((row) => row.barRatio)).toEqual([1, 0.25]);
  });

  it("labels a weekday bucket the same way the dimension tables do", () => {
    const [row] = buildMissedRows("weekday", [
      missed({ dimension: "weekday", bucket: "5", missed: 2, entries: 3 }),
    ]);

    expect(row.label).toBe("Friday");
  });
});

describe("groupMissedByDimension", () => {
  it("splits one result set into the four missed dimensions", () => {
    const grouped = groupMissedByDimension([
      missed({ dimension: "weekday", bucket: "2", missed: 1, entries: 2 }),
      missed({ dimension: "instrument", bucket: "MES", missed: 4, entries: 9 }),
    ]);

    expect(Object.keys(grouped)).toEqual(MISSED_DIMENSION_IDS);
    expect(grouped.weekday.map((row) => row.label)).toEqual(["Tuesday"]);
    expect(grouped.instrument.map((row) => row.label)).toEqual(["MES"]);
    expect(grouped.session).toEqual([]);
    expect(grouped.setupType).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import {
  ANALYTICS_QUESTIONS,
  buildDimensionRows,
  buildMissedRows,
  columnOrder,
  DIMENSION_IDS,
  type DimensionAggregateRow,
  type DimensionId,
  detailOrder,
  formatBucketLabel,
  groupByDimension,
  groupMissedByDimension,
  MISSED_DIMENSION_IDS,
  type MissedAggregateRow,
  NOT_SET_LABEL,
  rankBuckets,
  shouldExplainMissingAvgR,
  sortByMetric,
  splitRecordedDimensions,
  zeroLineLayout,
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

    // The ranking only trusts an avg R carried by enough trades, so the count
    // travels with the row.
    it("keeps how many trades carried an R", () => {
      const [row] = buildDimensionRows("setupType", [
        aggregate({ bucket: "Reversal", trades: 5, rSum: 3, rCount: 2 }),
      ]);

      expect(row.rCount).toBe(2);
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

    // Not set often holds most trades; on the shared scale it dwarfed the
    // real buckets. It keeps its figures and loses its bar.
    it("leaves Not set out of the scale and gives it no bar", () => {
      const rows = buildDimensionRows("setupType", [
        aggregate({ bucket: "A", netPnlCents: 10000 }),
        aggregate({ bucket: "B", netPnlCents: -5000 }),
        aggregate({ bucket: null, netPnlCents: 90000 }),
      ]);

      expect(rows.map((row) => [row.label, row.barRatio])).toEqual([
        ["A", 1],
        ["B", 0.5],
        [NOT_SET_LABEL, null],
      ]);
      expect(rows[2].netPnlCents).toBe(90000);
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

describe("splitRecordedDimensions", () => {
  // One aggregate row per dimension named, every other dimension empty.
  function grouped(
    rows: Partial<Record<DimensionId, DimensionAggregateRow[]>>,
  ) {
    return groupByDimension(
      DIMENSION_IDS.flatMap((dimension) =>
        (rows[dimension] ?? []).map((row) => ({ ...row, dimension })),
      ),
    );
  }

  it("calls a dimension recorded when it has a set bucket", () => {
    const { recorded, notRecorded } = splitRecordedDimensions(
      grouped({ session: [aggregate({ bucket: "NY-AM" })] }),
    );
    expect(recorded).toEqual(["session"]);
    expect(notRecorded).toEqual([
      "account",
      "setupType",
      "entryModel",
      "instrument",
      "weekday",
      "hour",
      "confluence",
      "felt",
      "grade",
      "mistake",
    ]);
  });

  it("calls a dimension with no rows not recorded", () => {
    const { recorded, notRecorded } = splitRecordedDimensions(grouped({}));
    expect(recorded).toEqual([]);
    expect(notRecorded).toEqual([
      "account",
      "setupType",
      "entryModel",
      "session",
      "instrument",
      "weekday",
      "hour",
      "confluence",
      "felt",
      "grade",
      "mistake",
    ]);
  });

  it("calls a dimension with only a Not set bucket not recorded", () => {
    const { recorded, notRecorded } = splitRecordedDimensions(
      grouped({ setupType: [aggregate({ bucket: null, trades: 59 })] }),
    );
    expect(recorded).toEqual([]);
    expect(notRecorded).toContain("setupType");
  });

  it("keeps the card of a dimension with one set bucket beside Not set", () => {
    const { recorded } = splitRecordedDimensions(
      grouped({
        setupType: [
          aggregate({ bucket: null, trades: 58 }),
          aggregate({ bucket: "Breakout", trades: 1 }),
        ],
      }),
    );
    expect(recorded).toEqual(["setupType"]);
  });

  it("returns both lists in the order of the dimensions", () => {
    const { recorded, notRecorded } = splitRecordedDimensions(
      grouped({
        mistake: [aggregate({ bucket: "Chased" })],
        account: [aggregate({ bucket: "Lucid 25k Eval" })],
        weekday: [aggregate({ bucket: "1" })],
      }),
    );
    expect(recorded).toEqual(["account", "weekday", "mistake"]);
    expect(notRecorded).toEqual([
      "setupType",
      "entryModel",
      "session",
      "instrument",
      "hour",
      "confluence",
      "felt",
      "grade",
    ]);
  });
});

describe("shouldExplainMissingAvgR", () => {
  const grouped = groupByDimension;

  it("explains the dash when trades exist but no bucket has an Avg R", () => {
    expect(
      shouldExplainMissingAvgR(
        grouped([
          aggregate({ dimension: "session", bucket: "NY-AM", trades: 29 }),
          aggregate({ dimension: "weekday", bucket: "1", trades: 12 }),
        ]),
      ),
    ).toBe(true);
  });

  it("stays quiet as soon as one bucket has an Avg R", () => {
    expect(
      shouldExplainMissingAvgR(
        grouped([
          aggregate({ dimension: "session", bucket: "NY-AM", trades: 29 }),
          aggregate({
            dimension: "weekday",
            bucket: "1",
            trades: 12,
            rSum: 3,
            rCount: 3,
          }),
        ]),
      ),
    ).toBe(false);
  });

  it("counts an Avg R in a dimension that is not recorded", () => {
    expect(
      shouldExplainMissingAvgR(
        grouped([
          aggregate({ dimension: "session", bucket: "NY-AM", trades: 29 }),
          aggregate({
            dimension: "setupType",
            bucket: null,
            trades: 5,
            rSum: 2,
            rCount: 2,
          }),
        ]),
      ),
    ).toBe(false);
  });

  it("has nothing to explain when only Not set buckets exist, as no card shows", () => {
    expect(
      shouldExplainMissingAvgR(
        grouped([
          aggregate({ dimension: "setupType", bucket: null, trades: 59 }),
        ]),
      ),
    ).toBe(false);
  });

  it("counts an Avg R of exactly zero as an Avg R", () => {
    expect(
      shouldExplainMissingAvgR(
        grouped([
          aggregate({
            dimension: "session",
            bucket: "NY-AM",
            trades: 4,
            rSum: 0,
            rCount: 2,
          }),
        ]),
      ),
    ).toBe(false);
  });

  it("has nothing to explain when there are no buckets at all", () => {
    expect(shouldExplainMissingAvgR(grouped([]))).toBe(false);
  });
});

describe("rankBuckets", () => {
  // One aggregate per bucket: avg R is rSum / rCount.
  function withR(
    dimension: DimensionId,
    bucket: string | null,
    avgR: number,
    rCount: number,
  ): DimensionAggregateRow {
    return aggregate({
      dimension,
      bucket,
      trades: rCount,
      rSum: avgR * rCount,
      rCount,
      netPnlCents: avgR * 10000,
    });
  }

  function ranked(rows: DimensionAggregateRow[]) {
    const { holdingUp, dragging } = rankBuckets(groupByDimension(rows));
    const name = (bucket: { dimension: DimensionId; row: { label: string } }) =>
      `${bucket.dimension}:${bucket.row.label}`;
    return { holdingUp: holdingUp.map(name), dragging: dragging.map(name) };
  }

  it("ranks by avg R across dimensions, strongest and weakest first", () => {
    expect(
      ranked([
        withR("setupType", "Reversal", 1.2, 4),
        withR("session", "London", 2.5, 3),
        withR("hour", "9", -0.8, 5),
        withR("mistake", "Chased", -1.5, 3),
        withR("grade", "A", 0.4, 6),
      ]),
    ).toEqual({
      holdingUp: ["session:London", "setupType:Reversal", "grade:A"],
      dragging: ["mistake:Chased", "hour:09:00"],
    });
  });

  // A bucket never looks strong on one or two trades.
  it("leaves out a bucket with fewer than three trades with an R", () => {
    expect(
      ranked([
        withR("setupType", "Reversal", 3, 2),
        withR("setupType", "Breakout", 1, 3),
      ]).holdingUp,
    ).toEqual(["setupType:Breakout"]);
  });

  it("counts trades with an R, not all trades", () => {
    const bucket = aggregate({
      dimension: "setupType",
      bucket: "Reversal",
      trades: 10,
      rSum: 4,
      rCount: 2,
    });

    expect(ranked([bucket]).holdingUp).toEqual([]);
  });

  it("never ranks the account dimension or Not set", () => {
    expect(
      ranked([
        withR("account", "Live", 2, 10),
        withR("setupType", null, 2, 10),
      ]),
    ).toEqual({ holdingUp: [], dragging: [] });
  });

  it("puts an avg R of exactly zero on neither side", () => {
    expect(ranked([withR("setupType", "Flat", 0, 5)])).toEqual({
      holdingUp: [],
      dragging: [],
    });
  });

  it("shows at most five on each side", () => {
    const rows = [1, 2, 3, 4, 5, 6].flatMap((index) => [
      withR("setupType", `Up ${index}`, index / 10, 3),
      withR("setupType", `Down ${index}`, -index / 10, 3),
    ]);

    const { holdingUp, dragging } = ranked(rows);
    expect(holdingUp).toHaveLength(5);
    expect(holdingUp[0]).toBe("setupType:Up 6");
    expect(dragging).toHaveLength(5);
    expect(dragging[0]).toBe("setupType:Down 6");
  });
});

describe("ANALYTICS_QUESTIONS", () => {
  it("puts every one of the eleven dimensions into exactly one question", () => {
    const placed = ANALYTICS_QUESTIONS.flatMap(
      (question) => question.dimensions,
    );

    expect([...placed].sort()).toEqual([...DIMENSION_IDS].sort());
  });

  it("asks the six questions in the order the page reads them", () => {
    expect(ANALYTICS_QUESTIONS.map((question) => question.title)).toEqual([
      "What holds my results up, what drags them down?",
      "When do I trade well?",
      "What am I trading, and how?",
      "How do I execute?",
      "What gets in my way?",
      "Where do I hesitate?",
    ]);
  });
});

describe("columnOrder", () => {
  const labels = (dimension: "weekday" | "hour", buckets: (string | null)[]) =>
    columnOrder(
      dimension,
      buildDimensionRows(
        dimension,
        buckets.map((bucket, index) =>
          aggregate({ dimension, bucket, netPnlCents: index * 100 }),
        ),
      ),
    ).map((row) => row.label);

  // The columns read as a week and as a day, not by money.
  it("orders weekdays Monday to Sunday", () => {
    expect(labels("weekday", ["0", "5", "1", "3"])).toEqual([
      "Monday",
      "Wednesday",
      "Friday",
      "Sunday",
    ]);
  });

  it("orders hours through the day", () => {
    expect(labels("hour", ["14", "9", "10", "8"])).toEqual([
      "08:00",
      "09:00",
      "10:00",
      "14:00",
    ]);
  });

  it("leaves Not set out of the columns", () => {
    expect(labels("hour", ["9", null])).toEqual(["09:00"]);
  });
});

describe("zeroLineLayout", () => {
  // The axis runs from the largest loss (0) to the largest gain (100), in
  // percent; a bar is where it starts on that axis and how long it is.
  it("places the zero line by the ratio of the largest gain to the largest loss", () => {
    expect(zeroLineLayout([300, -100, 150])).toEqual({
      zero: 25,
      bars: [
        { start: 25, length: 75 },
        { start: 0, length: 25 },
        { start: 25, length: 37.5 },
      ],
    });
  });

  it("gives a page of only gains the whole axis", () => {
    expect(zeroLineLayout([200, 100])).toEqual({
      zero: 0,
      bars: [
        { start: 0, length: 100 },
        { start: 0, length: 50 },
      ],
    });
  });

  it("gives a page of only losses the whole axis", () => {
    expect(zeroLineLayout([-50, -100])).toEqual({
      zero: 100,
      bars: [
        { start: 50, length: 50 },
        { start: 0, length: 100 },
      ],
    });
  });

  it("leaves a value without a bar out of the scale", () => {
    expect(zeroLineLayout([100, null])).toEqual({
      zero: 0,
      bars: [{ start: 0, length: 100 }, null],
    });
  });

  it("draws nothing when every value is zero", () => {
    expect(zeroLineLayout([0, 0])).toEqual({
      zero: 0,
      bars: [
        { start: 0, length: 0 },
        { start: 0, length: 0 },
      ],
    });
  });

  // Rounded so server and browser print the same SVG attributes.
  it("rounds to two decimals", () => {
    expect(zeroLineLayout([1, -2])).toEqual({
      zero: 66.67,
      bars: [
        { start: 66.67, length: 33.33 },
        { start: 0, length: 66.67 },
      ],
    });
  });
});

describe("sortByMetric", () => {
  const rows = buildDimensionRows("setupType", [
    aggregate({ bucket: "A", trades: 2, wins: 2, netPnlCents: 500 }),
    aggregate({
      bucket: "B",
      trades: 8,
      wins: 2,
      netPnlCents: -300,
      rSum: -1,
      rCount: 4,
    }),
    aggregate({
      bucket: "C",
      trades: 4,
      wins: 3,
      netPnlCents: 100,
      rSum: 3,
      rCount: 2,
    }),
    aggregate({ bucket: null, trades: 20, wins: 20, netPnlCents: 9000 }),
  ]);
  const order = (metric: Parameters<typeof sortByMetric>[1]) =>
    sortByMetric(rows, metric).map((row) => row.label);

  it("sorts by the switched metric, highest first", () => {
    expect(order("pnl")).toEqual(["A", "C", "B", NOT_SET_LABEL]);
    expect(order("trades")).toEqual(["B", "C", "A", NOT_SET_LABEL]);
    expect(order("winRate")).toEqual(["A", "C", "B", NOT_SET_LABEL]);
  });

  it("puts a bucket without a value after the ones that have one", () => {
    // A has no trade with an R.
    expect(order("avgR")).toEqual(["C", "B", "A", NOT_SET_LABEL]);
  });
});

describe("detailOrder", () => {
  const rows = (dimension: DimensionId) =>
    buildDimensionRows(dimension, [
      aggregate({
        dimension,
        bucket: "A",
        trades: 2,
        wins: 2,
        netPnlCents: 500,
      }),
      aggregate({
        dimension,
        bucket: "B",
        trades: 8,
        wins: 1,
        netPnlCents: -300,
      }),
      aggregate({
        dimension,
        bucket: "C",
        trades: 4,
        wins: 3,
        netPnlCents: 100,
      }),
    ]);
  const labels = (
    dimension: DimensionId,
    metric: Parameters<typeof detailOrder>[2],
  ) => detailOrder(dimension, rows(dimension), metric).map((row) => row.label);

  it("orders a dimension by the switched metric", () => {
    expect(labels("setupType", "trades")).toEqual(["B", "C", "A"]);
  });

  // Do not build: sorting or ranking by account. Accounts keep the net P&L
  // order of the old table, whatever the switch shows.
  it("keeps accounts in net P&L order whatever the metric", () => {
    for (const metric of ["pnl", "winRate", "avgR", "trades"] as const) {
      expect(labels("account", metric)).toEqual(["A", "C", "B"]);
    }
  });
});

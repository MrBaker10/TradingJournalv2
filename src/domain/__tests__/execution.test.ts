import { describe, expect, it } from "vitest";
import {
  bucketIndexOf,
  buildExcursionRows,
  capturedShare,
  type ExcursionCount,
  formatHoldTime,
  MAE_BUCKETS,
  MFE_BUCKETS,
} from "../execution.ts";

function count(
  overrides: Partial<ExcursionCount> & { bucketIndex: number; trades: number },
): ExcursionCount {
  return { kind: "mae", outcome: "winner", ...overrides };
}

describe("formatHoldTime", () => {
  it("prints an hour and minutes", () => {
    expect(formatHoldTime(95)).toBe("1h 35m");
    expect(formatHoldTime(165)).toBe("2h 45m");
  });

  it("drops the hour part under an hour", () => {
    expect(formatHoldTime(40)).toBe("40m");
    expect(formatHoldTime(0)).toBe("0m");
  });

  it("prints a whole hour without stray minutes", () => {
    expect(formatHoldTime(60)).toBe("1h 0m");
    expect(formatHoldTime(120)).toBe("2h 0m");
  });

  it("rounds to whole minutes, because the input was a chart clock", () => {
    expect(formatHoldTime(29.6)).toBe("30m");
    expect(formatHoldTime(94.4)).toBe("1h 34m");
  });

  it("has nothing to print without a duration", () => {
    expect(formatHoldTime(null)).toBe("—");
  });
});

describe("capturedShare", () => {
  it("is the realised part of what was available", () => {
    // Ran 2R, gave back 1R after the exit: two thirds captured.
    expect(capturedShare(2, 1)).toBeCloseTo(2 / 3, 10);
    expect(capturedShare(1, 1)).toBe(0.5);
  });

  it("is 1 when nothing was left on the table", () => {
    expect(capturedShare(2, 0)).toBe(1);
  });

  it("has no answer for a loss", () => {
    // A losing trade has no efficiency worth printing, and the denominator
    // would make the share read like one.
    expect(capturedShare(-1, 0)).toBeNull();
    expect(capturedShare(-2, 1)).toBeNull();
  });

  it("has no answer when the available move is exactly zero", () => {
    expect(capturedShare(0, 0)).toBeNull();
    expect(capturedShare(-1, 1)).toBeNull();
  });
});

describe("bucketIndexOf", () => {
  it("places an MAE by magnitude, whichever sign was typed", () => {
    // src/schemas/trades.ts takes a plain number and the form does not say
    // whether an adverse excursion is -0.5 or 0.5.
    expect(bucketIndexOf("mae", -0.3)).toBe(1);
    expect(bucketIndexOf("mae", 0.3)).toBe(1);
  });

  it("puts a value on a boundary into the upper bucket", () => {
    expect(bucketIndexOf("mae", 0.25)).toBe(1);
    expect(bucketIndexOf("mae", 0.5)).toBe(2);
    expect(bucketIndexOf("mae", 1)).toBe(4);
  });

  it("walks the MAE buckets", () => {
    expect(bucketIndexOf("mae", 0)).toBe(0);
    expect(bucketIndexOf("mae", 0.2)).toBe(0);
    expect(bucketIndexOf("mae", 0.6)).toBe(2);
    expect(bucketIndexOf("mae", 0.9)).toBe(3);
    expect(bucketIndexOf("mae", 4)).toBe(4);
  });

  it("walks the wider MFE buckets", () => {
    expect(bucketIndexOf("mfe", 0.4)).toBe(0);
    expect(bucketIndexOf("mfe", 0.5)).toBe(1);
    expect(bucketIndexOf("mfe", 1.5)).toBe(2);
    expect(bucketIndexOf("mfe", 2.5)).toBe(3);
    expect(bucketIndexOf("mfe", 12)).toBe(4);
  });

  it("never falls outside its own bucket list", () => {
    expect(bucketIndexOf("mae", 999)).toBe(MAE_BUCKETS.length - 1);
    expect(bucketIndexOf("mfe", 999)).toBe(MFE_BUCKETS.length - 1);
  });
});

describe("buildExcursionRows", () => {
  it("returns every bucket, empty ones included", () => {
    const rows = buildExcursionRows("mae", "winner", [
      count({ bucketIndex: 0, trades: 3 }),
    ]);

    // The shape of the distribution is the finding — a dropped row would hide
    // the gap it is meant to show.
    expect(rows).toHaveLength(MAE_BUCKETS.length);
    expect(rows.map((row) => row.trades)).toEqual([3, 0, 0, 0, 0]);
    expect(rows.map((row) => row.label)).toEqual(
      MAE_BUCKETS.map((bucket) => bucket.label),
    );
  });

  it("derives the share from this outcome's own total", () => {
    const rows = buildExcursionRows("mae", "winner", [
      count({ bucketIndex: 0, trades: 3 }),
      count({ bucketIndex: 2, trades: 1 }),
    ]);

    expect(rows[0].share).toBe(0.75);
    expect(rows[2].share).toBe(0.25);
    expect(rows[1].share).toBe(0);
  });

  it("scales the bar against the largest bucket", () => {
    const rows = buildExcursionRows("mae", "winner", [
      count({ bucketIndex: 0, trades: 4 }),
      count({ bucketIndex: 1, trades: 1 }),
    ]);

    expect(rows[0].barRatio).toBe(1);
    expect(rows[1].barRatio).toBe(0.25);
    expect(rows[4].barRatio).toBe(0);
  });

  it("keeps the two outcomes apart", () => {
    const counts = [
      count({ outcome: "winner", bucketIndex: 0, trades: 3 }),
      count({ outcome: "loser", bucketIndex: 4, trades: 2 }),
    ];

    expect(
      buildExcursionRows("mae", "winner", counts).map((row) => row.trades),
    ).toEqual([3, 0, 0, 0, 0]);
    expect(
      buildExcursionRows("mae", "loser", counts).map((row) => row.trades),
    ).toEqual([0, 0, 0, 0, 2]);
  });

  it("keeps the two kinds apart", () => {
    const counts: ExcursionCount[] = [
      count({ kind: "mae", bucketIndex: 0, trades: 3 }),
      count({ kind: "mfe", bucketIndex: 3, trades: 5 }),
    ];

    expect(
      buildExcursionRows("mae", "winner", counts).map((row) => row.trades),
    ).toEqual([3, 0, 0, 0, 0]);
    expect(
      buildExcursionRows("mfe", "winner", counts).map((row) => row.trades),
    ).toEqual([0, 0, 0, 5, 0]);
  });

  it("returns nothing at all when no trade carried the value", () => {
    // Which is what lets the card print its quiet sentence instead of five
    // zeroes pretending to be a distribution.
    expect(buildExcursionRows("mae", "winner", [])).toEqual([]);
    expect(
      buildExcursionRows("mae", "winner", [
        count({ outcome: "loser", bucketIndex: 0, trades: 2 }),
      ]),
    ).toEqual([]);
  });
});

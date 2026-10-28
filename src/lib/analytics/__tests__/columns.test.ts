import { describe, expect, it } from "vitest";
import { axisY, columnRect, toPercent } from "../columns.ts";

describe("columnRect", () => {
  // The plot is split into one slot per bucket; a column fills 80 % of its
  // slot, centred, and stands on the bar from `zeroLineLayout`. SVG counts y
  // from the top, the axis from the bottom.
  it("places one column per slot, centred, from its bar", () => {
    expect(columnRect({ start: 25, length: 50 }, 1, 4)).toEqual({
      x: 27.5,
      y: 25,
      width: 20,
      height: 50,
    });
  });

  it("puts a loss below the zero line", () => {
    // Zero at 40 % from the bottom; a loss of 30 % runs down from it.
    expect(columnRect({ start: 10, length: 30 }, 0, 2)).toEqual({
      x: 5,
      y: 60,
      width: 40,
      height: 30,
    });
  });

  it("sets columns of one slot side by side", () => {
    // Five buckets, winners and losers: the loser column of the first bucket.
    expect(columnRect({ start: 0, length: 40 }, 0, 5, 1, 2)).toEqual({
      x: 10,
      y: 60,
      width: 8,
      height: 40,
    });
  });

  // Server and browser have to print the same attributes.
  it("rounds to two decimals", () => {
    expect(columnRect({ start: 0, length: 100 }, 1, 3)).toEqual({
      x: 36.67,
      y: 0,
      width: 26.67,
      height: 100,
    });
  });
});

describe("toPercent", () => {
  it("turns a 0–1 ratio into a rounded percent", () => {
    expect(toPercent(0.5)).toBe(50);
    expect(toPercent(2 / 3)).toBe(66.67);
    expect(toPercent(0)).toBe(0);
  });
});

describe("axisY", () => {
  it("turns a position on the axis, from the bottom, into SVG's y", () => {
    expect(axisY(25)).toBe(75);
    expect(axisY(0)).toBe(100);
    expect(axisY(66.67)).toBe(33.33);
  });
});

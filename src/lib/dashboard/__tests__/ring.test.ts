import { describe, expect, it } from "vitest";
import { ringPositions } from "../ring.ts";

describe("ringPositions", () => {
  it("starts at the top and runs clockwise on the unit circle", () => {
    expect(ringPositions(4)).toEqual([
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
    ]);
  });

  it("rounds every coordinate to four decimals so server and browser print the same", () => {
    const points = ringPositions(7);

    expect(points[1]).toEqual({ x: 0.7818, y: -0.6235 });
    for (const { x, y } of points) {
      expect(Number(x.toFixed(4))).toBe(x);
      expect(Number(y.toFixed(4))).toBe(y);
    }
  });

  it("has no point for an empty streak", () => {
    expect(ringPositions(0)).toEqual([]);
  });
});

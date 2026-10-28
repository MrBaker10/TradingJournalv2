import { describe, expect, it } from "vitest";
import { scoreRingArcs } from "../ring.ts";

const fullMarks = {
  showingUp: 40,
  completeness: 20,
  planAdherence: 25,
  reviewHabit: 15,
};

describe("scoreRingArcs", () => {
  // The ring is a circle with a path length of 100, so a part's arc is its
  // points: the four weights add up to the whole ring.
  it("lays the four parts end to end around the ring", () => {
    expect(scoreRingArcs(fullMarks)).toEqual([
      { key: "showingUp", start: 0, length: 39 },
      { key: "completeness", start: 40, length: 19 },
      { key: "planAdherence", start: 60, length: 24 },
      { key: "reviewHabit", start: 85, length: 14 },
    ]);
  });

  it("starts each part where the earned points of the parts before it end", () => {
    const arcs = scoreRingArcs({
      showingUp: 36.4,
      completeness: 15.2,
      planAdherence: 17.9,
      reviewHabit: 8.5,
    });

    expect(arcs.map((arc) => arc.start)).toEqual([0, 36.4, 51.6, 69.5]);
    expect(arcs.map((arc) => arc.length)).toEqual([35.4, 14.2, 16.9, 7.5]);
  });

  // Server and browser can print a different last digit of a float sum, and
  // the SVG then fails to hydrate.
  it("rounds to two decimals", () => {
    const arcs = scoreRingArcs({
      showingUp: 40 / 3,
      completeness: 0.1 + 0.2,
      planAdherence: 25 / 7,
      reviewHabit: 0,
    });

    expect(arcs.map((arc) => arc.start)).toEqual([0, 13.33, 13.63, 17.2]);
    expect(arcs.map((arc) => arc.length)).toEqual([12.33, 0, 2.57, 0]);
  });

  it("draws no arc for a part with nothing earned", () => {
    const arcs = scoreRingArcs({ ...fullMarks, completeness: 0 });

    expect(arcs[1]).toEqual({ key: "completeness", start: 40, length: 0 });
  });
});

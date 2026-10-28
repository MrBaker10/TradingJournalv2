import type { ConsistencyScore } from "../../domain/consistency.ts";

// The score ring on /progress: where each of the score's four parts sits on
// the ring. Mark placement only; the parts come from consistency.ts.

export type ScorePartKey = Exclude<keyof ConsistencyScore, "score">;

/** The ring's parts in drawing order, clockwise from the top. */
export const SCORE_PARTS: readonly ScorePartKey[] = [
  "showingUp",
  "completeness",
  "planAdherence",
  "reviewHabit",
];

/** Points left blank at the end of each arc, so neighbours stay apart. */
const ARC_GAP = 1;

export interface ScoreArc {
  key: ScorePartKey;
  /** Where the arc starts, in points from the top of the ring. */
  start: number;
  /** How long it is drawn, in points; 0 draws nothing. */
  length: number;
}

/**
 * Rounded to two decimals: server and browser can disagree on the last digit
 * of a float sum, and the ring then fails to hydrate. `|| 0` turns -0 into 0.
 */
function round(value: number): number {
  return Math.round(value * 100) / 100 || 0;
}

/**
 * The arcs of the score ring on a circle with a path length of 100. The four
 * weights add up to 100, so a part's earned points are its arc: no share is
 * computed twice and the ring is full exactly when the score is.
 */
export function scoreRingArcs(
  parts: Pick<ConsistencyScore, ScorePartKey>,
): ScoreArc[] {
  let start = 0;
  return SCORE_PARTS.map((key) => {
    const arc = {
      key,
      start: round(start),
      length: round(Math.max(0, parts[key] - ARC_GAP)),
    };
    start += parts[key];
    return arc;
  });
}

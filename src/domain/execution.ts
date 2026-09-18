// How a trade was executed, as opposed to what it paid: how long it was held,
// how much of the stop it actually used, and how much of the move it kept.
//
// Contract:
//
// - **Nothing is aggregated here.** Every average and count arrives finished
//   from `src/db/queries/analytics.ts`. This module divides, labels and sorts.
// - **No money, ever.** Every figure on this page-section is an R multiple, a
//   duration or a count. There is no cents value in this file and none in the
//   three components that read it.
// - MFE, post-exit MFE and "left on the table" are **hypothetical** — money
//   that was never realised. Design.md §4.9 forbids showing such a value in
//   green, so nothing here hands out a gain/loss tone.
// - The caller owns scope. The rows come from queries that already applied the
//   date range, the account selection and the practice filter.

/** Winners and losers are split by the derived P&L sign, as everywhere else. */
export type Outcome = "winner" | "loser";

export const OUTCOMES: Outcome[] = ["winner", "loser"];

export const OUTCOME_LABELS: Record<Outcome, string> = {
  winner: "Winners",
  loser: "Losers",
};

// --- Hold time -----------------------------------------------------------

/**
 * Minutes as `1h 35m`.
 *
 * A duration under an hour drops the hour part rather than printing `0h 40m`,
 * and anything at all is rounded to whole minutes: `entry_time` and
 * `exit_time` are chart-clock values the user typed, so a figure with seconds
 * would claim a precision the input never had.
 */
export function formatHoldTime(minutes: number | null): string {
  if (minutes === null) return "—";

  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const rest = total % 60;

  if (hours === 0) return `${rest}m`;
  return `${hours}h ${rest}m`;
}

// --- Exit efficiency -----------------------------------------------------

/**
 * The share of the available move the trade actually captured.
 *
 * `post-exit MFE` is how much further it ran after the exit, so
 * `r / (r + post)` is what was kept out of what was there. A trade that ran
 * 2R and gave back 1R after the exit captured two thirds.
 *
 * `null` whenever the denominator is zero or negative. That is not a rounding
 * guard: a losing trade has no "efficiency" worth printing, and dividing by a
 * negative total would produce a share above 1 or below 0 that reads like an
 * answer. The caller restricts this to winners for the same reason.
 */
export function capturedShare(
  realizedR: number,
  postExitMfeR: number,
): number | null {
  const available = realizedR + postExitMfeR;
  return available > 0 ? realizedR / available : null;
}

// --- Excursion distribution ----------------------------------------------

/** One bucket of the MAE/MFE distribution: `[lower, upper)` in R. */
export interface ExcursionBucket {
  label: string;
  /** Inclusive lower bound in R. */
  from: number;
  /** Exclusive upper bound in R; `null` is the open top bucket. */
  to: number | null;
}

/**
 * MAE is bucketed by **magnitude**. `src/schemas/trades.ts` takes a plain
 * number for the field and the form does not say whether an adverse excursion
 * is typed as `-0.5` or `0.5`, so reading the sign would make the whole
 * distribution depend on a typing habit.
 *
 * The boundaries are the usual ones for an MAE study: the question is whether
 * winners ever came close to the stop, and quarter-R steps up to 1R answer it.
 */
export const MAE_BUCKETS: ExcursionBucket[] = [
  { label: "0 – 0.25R", from: 0, to: 0.25 },
  { label: "0.25 – 0.5R", from: 0.25, to: 0.5 },
  { label: "0.5 – 0.75R", from: 0.5, to: 0.75 },
  { label: "0.75 – 1R", from: 0.75, to: 1 },
  { label: "over 1R", from: 1, to: null },
];

/** MFE runs the other way and has no natural ceiling, so the steps widen. */
export const MFE_BUCKETS: ExcursionBucket[] = [
  { label: "0 – 0.5R", from: 0, to: 0.5 },
  { label: "0.5 – 1R", from: 0.5, to: 1 },
  { label: "1 – 2R", from: 1, to: 2 },
  { label: "2 – 3R", from: 2, to: 3 },
  { label: "over 3R", from: 3, to: null },
];

export type ExcursionKind = "mae" | "mfe";

export function bucketsFor(kind: ExcursionKind): ExcursionBucket[] {
  return kind === "mae" ? MAE_BUCKETS : MFE_BUCKETS;
}

/**
 * Which bucket a value falls into, by index.
 *
 * Exported so the query's `CASE` can be tested against the same boundaries the
 * labels come from, rather than the two drifting apart.
 */
export function bucketIndexOf(kind: ExcursionKind, value: number): number {
  const buckets = bucketsFor(kind);
  const magnitude = Math.abs(value);

  for (let index = 0; index < buckets.length; index++) {
    const bucket = buckets[index];
    if (bucket.to === null || magnitude < bucket.to) return index;
  }

  return buckets.length - 1;
}

/** One `GROUP BY` row of the distribution, as the query hands it back. */
export interface ExcursionCount {
  kind: ExcursionKind;
  outcome: Outcome;
  /** Index into `bucketsFor(kind)`. */
  bucketIndex: number;
  trades: number;
}

export interface ExcursionRow {
  label: string;
  trades: number;
  /** Share of this outcome's trades that carry a value, 0–1. */
  share: number;
  /** 0–1 against the largest bucket of this outcome. */
  barRatio: number;
}

/**
 * The distribution of one kind for one outcome, in bucket order.
 *
 * Every bucket is kept, including the empty ones: the shape of the
 * distribution is the finding, and a missing row would hide the gap it is
 * trying to show. Returns an empty list only when no trade of that outcome
 * carried the value at all, which is what lets the card print its quiet
 * sentence instead of five zeroes.
 */
export function buildExcursionRows(
  kind: ExcursionKind,
  outcome: Outcome,
  counts: ExcursionCount[],
): ExcursionRow[] {
  const mine = counts.filter(
    (count) => count.kind === kind && count.outcome === outcome,
  );

  const total = mine.reduce((sum, count) => sum + count.trades, 0);
  if (total === 0) return [];

  let largest = 0;
  for (const count of mine) {
    if (count.trades > largest) largest = count.trades;
  }

  return bucketsFor(kind).map((bucket, index) => {
    const trades =
      mine.find((count) => count.bucketIndex === index)?.trades ?? 0;
    return {
      label: bucket.label,
      trades,
      share: trades / total,
      barRatio: largest > 0 ? trades / largest : 0,
    };
  });
}

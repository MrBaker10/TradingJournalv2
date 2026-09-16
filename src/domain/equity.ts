import type { IsoDate } from "./streak.ts";

// The equity curve of one month: the running sum of the daily P&L, plus the
// numbers the axis needs to draw itself.
//
// Contract:
//
// - Amounts arrive as **integer cents** and leave as integer cents. The
//   running sum is the only money arithmetic here and it stays in integers;
//   the only floats this module produces are `zeroOffset`, which is a ratio,
//   and nothing else.
// - The caller owns scope. The days come from `getMonthDayTotals`, which has
//   already applied the account multiplier and the practice filter, so this
//   module multiplies nothing and filters nothing.
// - The accumulator starts at 0 on the first day of the series, never at a
//   balance carried in from the previous month. This is a month's curve, the
//   same window as every other figure on the dashboard, so its last point is
//   the month's Net P&L by construction.
// - A day with nothing but missed setups arrives with `amountCents: 0`. It is
//   a real point on the curve — the month was journaled that day — and it
//   simply does not move the line.

/** One day's money total, the shape `DayTotal` from the dashboard queries has. */
export interface EquityDay {
  date: IsoDate;
  amountCents: number;
}

export interface EquityPoint {
  date: IsoDate;
  /** That day's own total, in integer cents. */
  amountCents: number;
  /** The running total from the start of the series, in integer cents. */
  equityCents: number;
}

export interface EquitySeries {
  points: EquityPoint[];
  /** `[min, max]` in cents, rounded outward to whole ticks. Always spans 0. */
  domainCents: [number, number];
  /** The tick values, ascending, evenly spaced, always including 0. */
  ticksCents: number[];
  /**
   * Where the zero line sits between the top (0) and the bottom (1) of the
   * plot area. The two-tone gradient splits exactly there, which is why it is
   * computed from the domain rather than measured off the rendered chart: it
   * is arithmetic, and arithmetic can be tested.
   */
  zeroOffset: number;
}

/** Tick steps that read as round money: $1, $2, $2.50, $5 and their decades. */
const STEP_MULTIPLES = [1, 2, 2.5, 5, 10];

/** The axis aims for four gaps, which is five grid lines at most. */
const TARGET_STEPS = 4;

/**
 * No axis is labelled in fractions of a dollar. Below this the gap between
 * two grid lines is smaller than the rounding of the numbers printed on them.
 */
const MIN_STEP_CENTS = 100;

/** The step a month that never left zero gets, so its axis reads $-50 / $0 / $50. */
const FLAT_STEP_CENTS = 5000;

/**
 * The smallest round step that fits `range` into about `TARGET_STEPS` gaps.
 *
 * `Math.round` is what keeps the step a whole number of cents: 2.5 is the only
 * fractional multiple, and a fraction of a cent can only come out of a range
 * of a few cents, which the MIN_STEP_CENTS floor overrides anyway. A step of
 * zero would make the tick loop below never terminate.
 */
function niceStepCents(rangeCents: number): number {
  const rawStep = rangeCents / TARGET_STEPS;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));

  for (const multiple of STEP_MULTIPLES) {
    const step = multiple * magnitude;
    if (rawStep <= step) return Math.round(step);
  }

  return Math.round(10 * magnitude);
}

/**
 * The running month as a curve.
 *
 * Days are sorted here rather than trusted to arrive sorted: a running sum
 * over unordered rows is not a wrong curve, it is a meaningless one, and an
 * ISO date sorts correctly as a string.
 */
export function buildEquitySeries(days: EquityDay[]): EquitySeries {
  const ordered = [...days].sort((a, b) => a.date.localeCompare(b.date));

  let equityCents = 0;
  const points: EquityPoint[] = ordered.map((day) => {
    equityCents += day.amountCents;
    return { date: day.date, amountCents: day.amountCents, equityCents };
  });

  // Zero is always in the domain. A month that only ever lost still has to
  // show the line it fell away from, and the two-tone fill needs the split to
  // exist even when the curve never reaches it.
  let min = 0;
  let max = 0;
  for (const point of points) {
    if (point.equityCents < min) min = point.equityCents;
    if (point.equityCents > max) max = point.equityCents;
  }

  const range = max - min;
  const step =
    range > 0
      ? Math.max(MIN_STEP_CENTS, niceStepCents(range))
      : FLAT_STEP_CENTS;
  let domainMin = Math.floor(min / step) * step;
  let domainMax = Math.ceil(max / step) * step;

  // A month whose curve never leaves zero — every day journaled, nothing taken
  // — rounds to [0, 0]. That is not an axis, and every offset derived from it
  // divides by zero. It gets one step of room on each side instead.
  if (domainMin === 0 && domainMax === 0) {
    domainMin = -step;
    domainMax = step;
  }

  const ticksCents: number[] = [];
  for (let tick = domainMin; tick <= domainMax; tick += step) {
    ticksCents.push(tick);
  }

  return {
    points,
    domainCents: [domainMin, domainMax],
    ticksCents,
    zeroOffset: domainMax / (domainMax - domainMin),
  };
}

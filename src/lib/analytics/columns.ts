import type { ZeroLineBar } from "../../domain/analytics.ts";

// Where the columns of an Analytics chart stand, in percent of the plot, for
// hand-built SVG without a `viewBox` (coding-standards.md, Charts). Mark
// placement only: the bars themselves come from `zeroLineLayout`.

/** The share of a slot left empty, half on each side of its columns. */
const SLOT_GAP = 0.2;

export interface ColumnRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Two decimals, so server and browser print the same attributes. */
function round(value: number): number {
  return Math.round(value * 100) / 100 || 0;
}

/** A 0–1 ratio as a percent with two decimals. */
export function toPercent(ratio: number): number {
  return round(ratio * 100);
}

/** A position on the axis, which runs from the bottom, as SVG's y from the top. */
export function axisY(position: number): number {
  return round(100 - position);
}

/**
 * The column for `bar` in slot `index` of `count`, as x, y, width and height
 * in percent. A slot can hold `perSlot` columns side by side (winners and
 * losers); `column` picks one of them. The axis of `bar` runs from the
 * bottom, SVG's y from the top.
 */
export function columnRect(
  bar: ZeroLineBar,
  index: number,
  count: number,
  column = 0,
  perSlot = 1,
): ColumnRect {
  const slot = 100 / count;
  const width = (slot * (1 - SLOT_GAP)) / perSlot;
  return {
    x: round(index * slot + (slot * SLOT_GAP) / 2 + column * width),
    y: axisY(bar.start + bar.length),
    width: round(width),
    height: bar.length,
  };
}

"use client";

import { useReducedMotion } from "motion/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  usePlotArea,
  XAxis,
  YAxis,
} from "recharts";
import type { EquityPoint, EquitySeries } from "@/domain/equity";
import { type DisplayCurrency, formatCents } from "@/lib/money";
import {
  formatDateWithYear,
  formatDayLabel,
  formatMonthTickLabel,
} from "@/lib/time";

interface EquityCurveProps {
  series: EquitySeries;
  /** The display currency of the series (display-currency). */
  currency: DisplayCurrency;
}

// A little air at the top so the curve's peak does not touch the card edge.
const CHART_MARGIN = { top: 8, right: 8, bottom: 0, left: 8 };
// Room for "-$8,000.00" at 12px mono. Sized for the label, not guessed: a
// narrower axis clips the widest tick instead of wrapping it. A starting
// balance makes the labels longer ("$150,000.00"), so the width grows with
// the widest tick at the advance of a 12px mono digit.
const Y_AXIS_MIN_WIDTH = 84;
const MONO_12PX_ADVANCE = 7.3;
const Y_AXIS_PADDING = 12;

function yAxisWidth(ticksCents: number[], currency: DisplayCurrency): number {
  const widest = Math.max(
    0,
    ...ticksCents.map((cents) => formatCents(cents, { currency }).length),
  );
  return Math.max(
    Y_AXIS_MIN_WIDTH,
    Math.ceil(widest * MONO_12PX_ADVANCE + Y_AXIS_PADDING),
  );
}

const FILL_GRADIENT_ID = "equity-curve-fill";
const STROKE_GRADIENT_ID = "equity-curve-stroke";

// The fill is strongest at the far edge and fades to nothing at the starting
// line — zero without a balance — so the distance from the start is what the
// eye reads. It stays well below the
// calendar's 30%: this is a large surface, and a loud one would make the month
// look like a mood rather than a record.
const FILL_OPACITY_FAR = 0.3;
const FILL_OPACITY_AT_ZERO = 0.02;

/**
 * The two-tone split, green above the starting line and red below it. The
 * starting line is the account's starting balance, or zero without one
 * (Design.md §4.15).
 *
 * Both gradients are anchored to the **plot area in pixels**
 * (`gradientUnits="userSpaceOnUse"`), not to the bounding box of the filled
 * shape. With the default object bounding box the split would drift with the
 * shape: the area is drawn from the curve to the starting line, so its box is
 * not the axis and a ratio measured against the axis would land in the wrong
 * place.
 *
 * `baselineOffset` is the axis arithmetic from src/domain/equity.ts rather than a
 * measurement taken off the rendered chart — the y-domain is set by this
 * component and the scale over it is linear, so the ratio is exact and stays
 * testable without a DOM.
 *
 * The stops carry a class, not a colour: `var()` does not resolve inside the
 * `stop-color` attribute, so the token is applied by a CSS rule instead — the
 * same route the grid, the axis and the zero line already take (see the block
 * for `.equity-chart` in globals.css). Opacity stays here, because it is a
 * number rather than a colour and the two ends of each gradient differ.
 */
function SplitGradients({ baselineOffset }: { baselineOffset: number }) {
  const plotArea = usePlotArea();
  if (!plotArea) return null;

  const top = plotArea.y;
  const bottom = plotArea.y + plotArea.height;

  return (
    <defs>
      <linearGradient
        id={FILL_GRADIENT_ID}
        gradientUnits="userSpaceOnUse"
        x1={0}
        x2={0}
        y1={top}
        y2={bottom}
      >
        <stop
          offset={0}
          className="equity-fill-win"
          stopOpacity={FILL_OPACITY_FAR}
        />
        <stop
          offset={baselineOffset}
          className="equity-fill-win"
          stopOpacity={FILL_OPACITY_AT_ZERO}
        />
        <stop
          offset={baselineOffset}
          className="equity-fill-loss"
          stopOpacity={FILL_OPACITY_AT_ZERO}
        />
        <stop
          offset={1}
          className="equity-fill-loss"
          stopOpacity={FILL_OPACITY_FAR}
        />
      </linearGradient>

      {/* Two stops on the same offset: everything above it takes the first
          colour, everything below the second. A curve that never crossed its start
          puts the offset on an edge and comes out in one colour. */}
      <linearGradient
        id={STROKE_GRADIENT_ID}
        gradientUnits="userSpaceOnUse"
        x1={0}
        x2={0}
        y1={top}
        y2={bottom}
      >
        <stop offset={baselineOffset} className="equity-line-win" />
        <stop offset={baselineOffset} className="equity-line-loss" />
      </linearGradient>
    </defs>
  );
}

/** Above the start is a gain, below it a loss — against the start, not zero. */
function toneClass(cents: number, startCents: number): string {
  if (cents > startCents) return "text-success-fg";
  if (cents < startCents) return "text-danger-fg";
  return "text-fg-muted";
}

// Design.md §4.8 forbids a tooltip on the calendar tile, where the amount is
// already printed on the tile. Here nothing is printed, so a point is only
// readable through one — kept to a small surface, not a modal, and showing
// both the day's own result and where the month stood after it.
function EquityTooltip({
  active,
  payload,
  startCents,
  currency,
}: TooltipContentProps & { startCents: number; currency: DisplayCurrency }) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload as EquityPoint;

  return (
    <div className="card-surface edge flex flex-col gap-1 px-3 py-2">
      <span className="cap">{formatDayLabel(point.date)}</span>
      <span
        className={`font-mono text-[15px] font-semibold tabular-nums ${toneClass(point.equityCents, startCents)}`}
      >
        {/* With a starting balance the figure is where the account stood, not
            a result, so it carries no plus sign; without one it is the
            running result as before. */}
        {formatCents(point.equityCents, {
          signed: startCents === 0,
          currency,
        })}
      </span>
      <span className="text-fg-muted text-xs tabular-nums">
        {formatCents(point.amountCents, { signed: true, currency })} that day
      </span>
    </div>
  );
}

/**
 * Design.md §4.15: the running month as a cumulative curve.
 *
 * Money keeps its semantic colours and gets no glow (§1, §9) — the neon
 * treatment on this page belongs to streak, score and badges, not to the
 * equity line. The whole series arrives finished from the page; nothing here
 * adds, multiplies or divides money.
 */
export function EquityCurve({ series, currency }: EquityCurveProps) {
  // Recharts animates in JavaScript, so neither MotionConfig nor the
  // prefers-reduced-motion block in globals.css reaches it. The build-in has
  // to be switched off by hand.
  const prefersReducedMotion = useReducedMotion();

  // The range names itself out of the series — the first point is the first
  // day that was traded, so no separate query for "when did this start".
  const firstDate = series.points[0]?.date;

  // "Sep 3" on an axis covering more than one month leaves the reader guessing
  // the year, so a multi-month series gets month marks — and those have to be
  // chosen, or Recharts labels every point and prints "Aug 2026" twenty times.
  // Both come out of the series (src/domain/equity.ts), which is where they
  // can be tested.
  const spansMonths = series.monthTicks.length > 1;

  return (
    <section className="card-surface edge flex flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="cap cap-neon">Equity curve</h2>
        <span className="text-fg-subtle text-xs">
          {firstDate === undefined
            ? ""
            : `${formatDateWithYear(firstDate)} — today`}
        </span>
      </div>

      {series.points.length === 0 ? (
        <p className="py-10 text-center text-fg-subtle text-sm">
          Nothing logged yet. The curve starts with your first entry.
        </p>
      ) : (
        <div className="equity-chart h-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series.points} margin={CHART_MARGIN}>
              <SplitGradients baselineOffset={series.baselineOffset} />

              <CartesianGrid vertical={false} strokeDasharray="3 4" />

              <XAxis
                dataKey="date"
                ticks={spansMonths ? series.monthTicks : undefined}
                tickFormatter={
                  spansMonths ? formatMonthTickLabel : formatDayLabel
                }
                tickLine={false}
                axisLine={false}
                minTickGap={20}
                height={28}
              />
              <YAxis
                type="number"
                domain={series.domainCents}
                ticks={series.ticksCents}
                tickFormatter={(cents: number) =>
                  formatCents(cents, { currency })
                }
                tickLine={false}
                axisLine={false}
                width={yAxisWidth(series.ticksCents, currency)}
              />

              <ReferenceLine y={series.startCents} />

              <Tooltip
                content={(props) => (
                  <EquityTooltip
                    {...props}
                    startCents={series.startCents}
                    currency={currency}
                  />
                )}
                isAnimationActive={!prefersReducedMotion}
              />

              {/* baseValue fills between the curve and the starting line
                  rather than down to the bottom of the frame, which is what
                  makes a losing stretch read as a hole instead of a column. */}
              <Area
                type="monotone"
                dataKey="equityCents"
                baseValue={series.startCents}
                stroke={`url(#${STROKE_GRADIENT_ID})`}
                strokeWidth={2}
                fill={`url(#${FILL_GRADIENT_ID})`}
                dot={false}
                activeDot={{ r: 3.5 }}
                isAnimationActive={!prefersReducedMotion}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

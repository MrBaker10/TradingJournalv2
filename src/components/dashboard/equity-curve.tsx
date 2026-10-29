"use client";

import { useReducedMotion } from "motion/react";
import { useLocale } from "next-intl";
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
import type { EquitySeries, PlottedPoint } from "@/domain/equity";
import { SIGN_TEXT, signOf } from "@/lib/dashboard/sign-tone";
import type { Language } from "@/lib/i18n/languages";
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

function yAxisWidth(
  ticksCents: number[],
  currency: DisplayCurrency,
  language: Language,
): number {
  const widest = Math.max(
    0,
    ...ticksCents.map(
      (cents) => formatCents(cents, { currency, language }).length,
    ),
  );
  return Math.max(
    Y_AXIS_MIN_WIDTH,
    Math.ceil(widest * MONO_12PX_ADVANCE + Y_AXIS_PADDING),
  );
}

// The X key of the start point (src/domain/equity.ts, `plotted`).
const START_KEY = "start";

const FILL_GRADIENT_ID = "equity-curve-fill";
const STROKE_GRADIENT_ID = "equity-curve-stroke";

// The fill is strongest at the far edge and fades to nothing at the starting
// line — zero without a balance — so the distance from the start is what the
// eye reads (Design.md §3.2: faint to nothing, no glow).
const FILL_OPACITY_FAR = 0.2;
const FILL_OPACITY_AT_ZERO = 0.02;

/**
 * The two-tone split, green above the starting line and red below it. The
 * starting line is the account's starting balance, or zero without one
 * (Design.md §3.2).
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
  return SIGN_TEXT[signOf(cents, startCents)];
}

// Nothing on the curve is printed, so a point is only readable through a
// tooltip — kept to a small surface, not a modal, and showing both the day's
// own result and where the account stood after it.
function EquityTooltip({
  active,
  payload,
  startCents,
  currency,
}: TooltipContentProps & { startCents: number; currency: DisplayCurrency }) {
  const language = useLocale();
  if (!active || !payload?.length) return null;

  const point = payload[0].payload as PlottedPoint;

  // The start is where the curve leaves from, not a day: it has a balance
  // and no result of its own (decided 2026-09-26).
  if (point.kind === "start") {
    return (
      <div className="flex flex-col gap-1 rounded-md border bg-popover px-2.5 py-1.5 text-popover-foreground shadow-md">
        <span className="text-muted-foreground text-xs">Starting balance</span>
        <span
          className={`font-mono text-sm tabular-nums ${toneClass(point.equityCents, startCents)}`}
        >
          {formatCents(point.equityCents, { currency, language })}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 rounded-md border bg-popover px-2.5 py-1.5 text-popover-foreground shadow-md">
      <span className="text-muted-foreground text-xs">
        {formatDayLabel(point.date, language)}
      </span>
      <span
        className={`font-mono text-sm tabular-nums ${toneClass(point.equityCents, startCents)}`}
      >
        {/* With a starting balance the figure is where the account stood, not
            a result, so it carries no plus sign; without one it is the
            running result as before. */}
        {formatCents(point.equityCents, {
          signed: startCents === 0,
          currency,
          language,
        })}
      </span>
      <span className="font-mono text-muted-foreground text-xs tabular-nums">
        {formatCents(point.amountCents, { signed: true, currency, language })}{" "}
        that day
      </span>
    </div>
  );
}

/**
 * Design.md §3.2: the scope's result as a cumulative curve from the first
 * trade to today.
 *
 * Money keeps its sign colours and gets no glow (§1). The whole series arrives finished from the page; nothing here
 * adds, multiplies or divides money.
 */
export function EquityCurve({ series, currency }: EquityCurveProps) {
  // Recharts animates in JavaScript, so neither MotionConfig nor the
  // prefers-reduced-motion block in globals.css reaches it. The build-in has
  // to be switched off by hand.
  const prefersReducedMotion = useReducedMotion();
  const language = useLocale();

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
    <section
      aria-labelledby="equity-curve-heading"
      className="flex flex-col gap-2"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="equity-curve-heading"
          className="text-[11px] text-muted-foreground uppercase tracking-wider"
        >
          Equity curve
        </h2>
        <span className="text-muted-foreground text-xs">
          {firstDate === undefined
            ? ""
            : `${formatDateWithYear(firstDate, language)} — today`}
        </span>
      </div>

      {series.points.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground text-sm">
          Nothing logged yet. The curve starts with your first entry.
        </p>
      ) : (
        <div className="equity-chart h-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series.plotted} margin={CHART_MARGIN}>
              <SplitGradients baselineOffset={series.baselineOffset} />

              <CartesianGrid vertical={false} strokeDasharray="3 4" />

              <XAxis
                dataKey="key"
                ticks={
                  spansMonths ? [START_KEY, ...series.monthTicks] : undefined
                }
                tickFormatter={(key: string) =>
                  key === START_KEY
                    ? "Start"
                    : spansMonths
                      ? formatMonthTickLabel(key, language)
                      : formatDayLabel(key, language)
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
                  formatCents(cents, { currency, language })
                }
                tickLine={false}
                axisLine={false}
                width={yAxisWidth(series.ticksCents, currency, language)}
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

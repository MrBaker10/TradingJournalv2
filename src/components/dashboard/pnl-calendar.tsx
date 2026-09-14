"use client";

import { TZDate } from "@date-fns/tz";
import { format, getDate, getDay, subDays } from "date-fns";
import { motion } from "motion/react";
import Link from "next/link";
import type { DayTotal } from "@/db/queries/dashboard";
import type { IsoDate } from "@/domain/streak";
import { buildJournalHref } from "@/lib/journal/href";
import { formatCents } from "@/lib/money";
import { monthRangeOf } from "@/lib/time";

interface PnlCalendarProps {
  /** `YYYY-MM`, the running month in the user's own timezone. */
  month: string;
  today: IsoDate;
  days: DayTotal[];
}

// Sunday first, because Design.md §4.8 writes the header as S M T W T F S.
// This is a calendar grid, not the trading week — Sunday folding onto Monday
// is a streak rule and lives in src/domain/streak.ts.
const WEEKDAYS = [
  { key: "sunday", label: "S" },
  { key: "monday", label: "M" },
  { key: "tuesday", label: "T" },
  { key: "wednesday", label: "W" },
  { key: "thursday", label: "T" },
  { key: "friday", label: "F" },
  { key: "saturday", label: "S" },
];

const EASE_SOFT = [0.2, 0.7, 0.3, 1] as const;
const BUILD_IN_DELAY = 0.24;
const PER_CELL_DELAY = 0.012;

/** UTC-anchored: a date string carries no zone, and the machine's must not leak in. */
function dayOf(date: IsoDate): TZDate {
  return new TZDate(`${date}T00:00:00Z`, "UTC");
}

function isoDateOf(month: string, dayOfMonth: number): IsoDate {
  return `${month}-${String(dayOfMonth).padStart(2, "0")}`;
}

// The hover ring is per state rather than one shared white one, so a green day
// stays green while the mouse is over it instead of washing out.
function fillClass(amountCents: number): string {
  if (amountCents > 0) {
    return "bg-[image:var(--gradient-day-win)] shadow-[var(--shadow-day-win)] hover:shadow-[var(--shadow-day-win-hover)]";
  }
  if (amountCents < 0) {
    return "bg-[image:var(--gradient-day-loss)] shadow-[var(--shadow-day-loss)] hover:shadow-[var(--shadow-day-loss-hover)]";
  }
  return "shadow-[var(--shadow-day-flat)] hover:shadow-[var(--shadow-day-flat-hover)]";
}

function amountClass(amountCents: number): string {
  if (amountCents > 0) return "text-success-hi";
  if (amountCents < 0) return "text-danger-hi";
  return "text-fg-muted";
}

// Design.md §8: the colour coding does not reach a screen reader, so the
// label carries date, amount and entry count in words. A day with nothing
// logged is not a link and reads as its plain day number.
function ariaLabel(date: IsoDate, total: DayTotal): string {
  const day = format(dayOf(date), "MMMM d, yyyy");
  const entries =
    total.entryCount === 1 ? "1 entry" : `${total.entryCount} entries`;
  return `${day}, ${formatCents(total.amountCents, { signed: true })}, ${entries}`;
}

// Design.md §4.8. The coloured glow on a money day is deliberate and is the
// one exception to "money does not glow": on the tile it encodes density
// across the month, not reward, and the figure in the metric panel stays
// plain. Today is ringed in cyan whether it is green, red or empty.
export function PnlCalendar({ month, today, days }: PnlCalendarProps) {
  const range = monthRangeOf(month);
  const leadingBlanks = getDay(dayOf(range.from));
  const daysInMonth = getDate(dayOf(range.to));
  const totals = new Map(days.map((day) => [day.date, day]));

  return (
    <section className="card-surface edge flex flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="cap cap-neon">P&amp;L calendar</h2>
        <span className="text-fg-subtle text-xs">
          {format(dayOf(range.from), "MMMM yyyy")}
        </span>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday.key} className="cap text-center">
            {weekday.label}
          </span>
        ))}

        {/* Design.md §4.8: the previous month's cells are transparent and
            carry no frame. They are keyed by the date they stand for, so the
            grid has no positional keys. */}
        {Array.from({ length: leadingBlanks }, (_, index) => {
          const blankDate = format(
            subDays(dayOf(range.from), leadingBlanks - index),
            "yyyy-MM-dd",
          );
          return <div key={blankDate} aria-hidden="true" />;
        })}

        {Array.from({ length: daysInMonth }, (_, index) => {
          const date = isoDateOf(month, index + 1);
          const total = totals.get(date);
          const isToday = date === today;

          // Every cell answers the mouse with a lighter surface and ring.
          // `hover:bg-white/5` is a background-color and the fill is a
          // background-image, so both apply — and because the fill tops out at
          // 30% opacity, the tint reaches green and red days too.
          //
          // Only days with entries also lift. An empty day is not a link, and
          // lifting it would promise a click that does nothing.
          //
          // The lift is a CSS hover, not motion's `whileHover`. Design.md §5
          // divides the work that way — "hover, focus, colour and border
          // changes stay CSS transitions; motion only does row expansion,
          // disclosure panels, the streak bump and the load-in" — and the
          // `whileHover` this replaces never took effect at all. Both halves
          // of the hover now run through the same mechanism, and reduced
          // motion reaches them through the CSS block rather than MotionConfig.
          const className = `relative flex aspect-[1/0.82] flex-col justify-between rounded-ctl p-1.5 transition-[background-color,box-shadow,translate] duration-150 ease-[var(--ease-soft)] hover:bg-white/5 ${
            total ? "hover:-translate-y-0.5" : ""
          } ${fillClass(total?.amountCents ?? 0)}`;

          const content = (
            <>
              <span className="font-mono text-[11px] text-fg-muted tabular-nums">
                {index + 1}
              </span>
              {total && (
                <span className="flex flex-col">
                  <span
                    className={`font-mono text-[11px] font-bold tabular-nums ${amountClass(
                      total.amountCents,
                    )}`}
                  >
                    {formatCents(total.amountCents, { signed: true })}
                  </span>
                  <span className="font-mono text-[10px] text-fg-subtle tabular-nums">
                    {total.entryCount}
                  </span>
                </span>
              )}
              {isToday && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-ctl shadow-[var(--shadow-day-today)]"
                />
              )}
            </>
          );

          return (
            <motion.div
              key={date}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.3,
                delay: BUILD_IN_DELAY + index * PER_CELL_DELAY,
                ease: EASE_SOFT,
              }}
            >
              {total ? (
                <Link
                  href={buildJournalHref({}, { from: date, to: date })}
                  aria-label={ariaLabel(date, total)}
                  className={className}
                >
                  {content}
                </Link>
              ) : (
                <div className={className}>{content}</div>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

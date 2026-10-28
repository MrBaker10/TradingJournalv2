"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { DayTotal } from "@/db/queries/dashboard";
import type { IsoDate } from "@/domain/streak";
import {
  buildDashboardHref,
  type DashboardSearchParams,
} from "@/lib/dashboard/href";
import { monthGrid } from "@/lib/dashboard/month-grid";
import {
  SIGN_BAR,
  SIGN_TEXT,
  SIGN_TINT,
  signOf,
} from "@/lib/dashboard/sign-tone";
import { buildJournalHref } from "@/lib/journal/href";
import {
  type DisplayCurrency,
  formatCents,
  formatCentsCompact,
} from "@/lib/money";
import { formatDateWithYear, formatMonthLabel, shiftMonth } from "@/lib/time";

interface MonthCalendarProps {
  /** The running month on the user's clock — paging forward stops here. */
  currentMonth: string;
  /** Month of the first trade; paging back stops here. null = no trades. */
  firstTradeMonth: string | null;
  /** `YYYY-MM`, the month on screen. */
  month: string;
  today: IsoDate;
  days: DayTotal[];
  /** The display currency of the day totals (display-currency). */
  currency: DisplayCurrency;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Design.md §3.2: hover lifts a day above its neighbours with card surface,
// a 2 px translate, scale about 1.04 and a shadow; press settles to 1.01.
// Tailwind v4 drives translate and scale through their own properties, so the
// transition names them, never `transform`; the corners round at once, since
// only translate, scale, shadow and colour may move (coding-standards Motion).
// Reduced motion keeps the shadow.
const LIFT =
  "transition-[translate,scale,box-shadow,background-color] duration-150 ease-out hover:z-10 hover:-translate-y-0.5 hover:scale-[1.04] hover:rounded-md hover:bg-card hover:shadow-day-lift active:scale-[1.01] motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100 motion-reduce:active:scale-100";

// Design.md §5: the tint does not reach a screen reader, so the label carries
// date, amount and entry count in words.
function ariaLabel(total: DayTotal, currency: DisplayCurrency): string {
  const entries =
    total.entryCount === 1 ? "1 entry" : `${total.entryCount} entries`;
  return `${formatDateWithYear(total.date)}, ${formatCents(total.amountCents, { signed: true, currency })}, ${entries}`;
}

/**
 * The month as the dashboard's main area (Design.md §3.2). A day with entries
 * is tinted by the sign of its net P&L only, never by its size, and links to
 * the journal for that day. A day without entries is no link and does not
 * lift: it would promise a click that does nothing.
 */
export function MonthCalendar({
  month,
  today,
  days,
  currentMonth,
  firstTradeMonth,
  currency,
}: MonthCalendarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const weeks = monthGrid(month, today, days);

  // Paging stops where the data does: forward at the running month, back at
  // the month of the first trade.
  const canGoBack = firstTradeMonth !== null && month > firstTradeMonth;
  const canGoForward = month < currentMonth;

  function goTo(target: string) {
    const current = Object.fromEntries(
      searchParams.entries(),
    ) as DashboardSearchParams;
    // The running month writes no parameter — see buildDashboardHref.
    router.push(
      buildDashboardHref(current, {
        month: target === currentMonth ? undefined : target,
      }),
    );
  }

  return (
    <section aria-labelledby="calendar-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1
            id="calendar-heading"
            className="font-semibold text-xl tracking-tight"
          >
            {formatMonthLabel(month)}
          </h1>
          <span className="text-muted-foreground text-sm">
            {days.length} journaled {days.length === 1 ? "day" : "days"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="max-lg:size-10"
            disabled={!canGoBack}
            onClick={() => goTo(shiftMonth(month, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="max-lg:size-10"
            disabled={!canGoForward}
            onClick={() => goTo(shiftMonth(month, 1))}
            aria-label="Next month"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="grid grid-cols-7 rounded-t-lg border-b bg-muted/30 text-[11px] text-muted-foreground uppercase tracking-wider">
          {WEEKDAYS.map((weekday) => (
            <div key={weekday} className="px-1.5 py-1.5 sm:px-2">
              {weekday}
            </div>
          ))}
        </div>
        {weeks.map((week) => (
          <div
            key={week[0].date}
            className="grid grid-cols-7 border-b last:border-0"
          >
            {week.map((cell) => {
              const total = cell.day;
              const sign = total ? signOf(total.amountCents) : null;
              const content = (
                <>
                  {sign !== null && sign !== "zero" && (
                    // Sign only, never intensity: every win day gets the same faint tint.
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-0 rounded-[inherit] ${SIGN_TINT[sign]}`}
                    />
                  )}
                  <span
                    className={`relative font-mono text-xs tabular-nums ${
                      cell.isToday
                        ? "flex size-5 items-center justify-center rounded-full bg-foreground font-semibold text-background"
                        : "text-muted-foreground"
                    }`}
                  >
                    {Number(cell.date.slice(8))}
                  </span>
                  {total && sign !== null && (
                    <span className="relative flex items-end justify-between gap-x-1">
                      <span className="hidden text-[11px] text-muted-foreground sm:inline">
                        {total.entryCount}
                        <span className="hidden md:inline">
                          {total.entryCount === 1 ? " entry" : " entries"}
                        </span>
                      </span>
                      {/* Colour is never the only carrier of the sign
                          (Design.md §5): a phone's narrow day gets the
                          compact amount, the full one stays in the label. */}
                      <span
                        className={`font-mono text-[11px] tabular-nums sm:hidden ${SIGN_TEXT[sign]}`}
                      >
                        {formatCentsCompact(total.amountCents)}
                      </span>
                      <span
                        className={`hidden font-mono text-[13px] tabular-nums sm:inline ${SIGN_TEXT[sign]}`}
                      >
                        {formatCents(total.amountCents, {
                          signed: true,
                          currency,
                        })}
                      </span>
                    </span>
                  )}
                  {sign !== null && (
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-0 bottom-0 h-0.5 rounded-b-[inherit] ${SIGN_BAR[sign]}`}
                    />
                  )}
                </>
              );
              const cellClass =
                "relative flex h-16 flex-col justify-between border-r p-1.5 last:border-r-0 sm:h-20 sm:p-2";

              if (!cell.inMonth) {
                return (
                  <div
                    key={cell.date}
                    aria-hidden="true"
                    className={`${cellClass} opacity-30`}
                  >
                    {content}
                  </div>
                );
              }
              if (total) {
                return (
                  <Link
                    key={cell.date}
                    href={buildJournalHref(
                      {},
                      { from: cell.date, to: cell.date },
                    )}
                    aria-label={ariaLabel(total, currency)}
                    aria-current={cell.isToday ? "date" : undefined}
                    className={`${cellClass} ${LIFT} outline-none focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring/50`}
                  >
                    {content}
                  </Link>
                );
              }
              return (
                <div
                  key={cell.date}
                  aria-current={cell.isToday ? "date" : undefined}
                  className={cellClass}
                >
                  {content}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

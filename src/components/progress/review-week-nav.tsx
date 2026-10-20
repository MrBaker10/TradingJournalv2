import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { shiftReviewWeek } from "@/domain/review-week";
import type { IsoDate } from "@/domain/streak";
import { formatDayLabel } from "@/lib/time";

const PATH = "/progress/weekly-review";

/** The current week is the page without a parameter, like the dashboard month. */
function weekHref(weekStart: IsoDate, currentWeek: IsoDate): string {
  return weekStart === currentWeek ? PATH : `${PATH}?week=${weekStart}`;
}

interface ReviewWeekNavProps {
  weekStart: IsoDate;
  currentWeek: IsoDate;
  /** The strip's weeks, oldest first (`recentReviewWeeks`). */
  recentWeeks: IsoDate[];
  /** Week starts among `recentWeeks` that carry a review. */
  reviewedWeeks: IsoDate[];
}

// Design.md §4.26: a quiet stepper like the calendar's month step (4.8), and a
// strip of recent weeks so a missed review shows as a gap. The marker is
// process, so a reviewed week may carry the cyan dot; an open week stays
// matte, never red — a gap is a prompt, not a failure.
export function ReviewWeekNav({
  weekStart,
  currentWeek,
  recentWeeks,
  reviewedWeeks,
}: ReviewWeekNavProps) {
  const reviewed = new Set(reviewedWeeks);
  const isCurrent = weekStart === currentWeek;

  return (
    <nav aria-label="Review weeks" className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <WeekStep
          direction="back"
          href={weekHref(shiftReviewWeek(weekStart, -1), currentWeek)}
        />
        <span className="min-w-[7rem] text-center text-fg-subtle text-xs">
          {isCurrent ? "This week" : `Week of ${formatDayLabel(weekStart)}`}
        </span>
        <WeekStep
          direction="forward"
          href={
            isCurrent
              ? null
              : weekHref(shiftReviewWeek(weekStart, 1), currentWeek)
          }
        />
      </div>

      <ol className="flex flex-wrap gap-2">
        {recentWeeks.map((week) => {
          const isSelected = week === weekStart;
          const isReviewed = reviewed.has(week);
          return (
            <li key={week}>
              <Link
                href={weekHref(week, currentWeek)}
                aria-current={isSelected ? "page" : undefined}
                aria-label={`Week of ${formatDayLabel(week)}, ${
                  isReviewed ? "reviewed" : "not reviewed"
                }`}
                className={`flex h-8 items-center gap-1.5 rounded-ctl border px-2.5 text-xs transition-colors duration-150 ${
                  isSelected
                    ? "border-cyan/60 text-fg"
                    : "border-white/12 text-fg-subtle hover:border-cyan/35 hover:text-fg"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${
                    isReviewed ? "bg-cyan" : "border border-white/30"
                  }`}
                />
                {formatDayLabel(week)}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const STEP_CLASS =
  "flex h-7 w-7 items-center justify-center rounded-xs text-fg-subtle";

/**
 * One step through the weeks, the calendar's `MonthStep` as a link. Without
 * an `href` it is the inert forward step on the current week: drawn at 30 %
 * so the stepper keeps its shape, hidden from screen readers because there is
 * nothing to do.
 */
function WeekStep({
  direction,
  href,
}: {
  direction: "back" | "forward";
  href: string | null;
}) {
  const Icon = direction === "back" ? ChevronLeft : ChevronRight;
  if (href === null) {
    return (
      <span aria-hidden="true" className={`${STEP_CLASS} opacity-30`}>
        <Icon className="h-4 w-4" />
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={direction === "back" ? "Previous week" : "Next week"}
      className={`${STEP_CLASS} transition-colors duration-150 hover:text-fg`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

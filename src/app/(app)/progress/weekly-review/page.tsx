import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ReviewWeekNav } from "@/components/progress/review-week-nav";
import { WeekSummaryCard } from "@/components/progress/week-summary-card";
import { WeeklyReviewForm } from "@/components/progress/weekly-review-form";
import {
  getWeeklyReview,
  getWeekSummary,
  listReviewedWeekStarts,
} from "@/db/queries/weekly-reviews";
import {
  recentReviewWeeks,
  resolveReviewWeek,
  reviewWeekRange,
  reviewWeekStartOf,
} from "@/domain/review-week";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { firstValue } from "@/lib/search-params";
import { formatDateWithYear, todayInTimeZone } from "@/lib/time";

export default async function WeeklyReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, rawParams] = await Promise.all([getCurrentUser(), searchParams]);

  // The review belongs to the user, not to an account, so the account
  // selector plays no part here. Which week is current is the user's own
  // calendar (users.timezone); trades fall into it by their trade date.
  // `?week=` is resolved here against that clock: an invalid or future week
  // opens the current one.
  const today = todayInTimeZone(user.timezone);
  const currentWeek = reviewWeekStartOf(today);
  const weekStart = resolveReviewWeek(firstValue(rawParams.week), today);
  const range = reviewWeekRange(weekStart);
  const recentWeeks = recentReviewWeeks(currentWeek);

  const [review, reviewedWeeks, summary] = await Promise.all([
    getWeeklyReview(user.id, weekStart),
    listReviewedWeekStarts(
      user.id,
      recentWeeks[0],
      recentWeeks[recentWeeks.length - 1],
    ),
    getWeekSummary(user.id, weekStart),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/progress"
          className="flex w-fit items-center gap-1.5 text-fg-subtle text-sm transition-colors duration-150 hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Progress
        </Link>
        <h1 className="page-title">Weekly Review</h1>
        <p className="text-fg-muted text-sm">
          {formatDateWithYear(range.from)} – {formatDateWithYear(range.to)} ·
          Sunday to Friday. Counts towards nothing but the habit itself.
        </p>
      </div>

      <ReviewWeekNav
        weekStart={weekStart}
        currentWeek={currentWeek}
        recentWeeks={recentWeeks}
        reviewedWeeks={reviewedWeeks}
      />

      {/* items-start so the summary keeps its own height beside the form. */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Keyed by week so a different week starts from its own text. */}
        <WeeklyReviewForm
          key={weekStart}
          weekStart={weekStart}
          review={review}
        />
        <WeekSummaryCard summary={summary} />
      </div>
    </div>
  );
}

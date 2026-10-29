import { ArrowLeft } from "lucide-react";
import { ReviewWeekNav } from "@/components/progress/review-week-nav";
import { WeekSummaryCard } from "@/components/progress/week-summary-card";
import { WeeklyReviewForm } from "@/components/progress/weekly-review-form";
import { withDisplayCurrency } from "@/db/queries/scope";
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
import { Link } from "@/lib/i18n/navigation";
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

  // Net P&L is shown in the "All accounts" display currency: the real
  // accounts' own if they share one, else USD (display-currency).
  const { currency } = await withDisplayCurrency({
    userId: user.id,
    selectedAccountId: null,
  });

  const [review, reviewedWeeks, summary] = await Promise.all([
    getWeeklyReview(user.id, weekStart),
    listReviewedWeekStarts(
      user.id,
      recentWeeks[0],
      recentWeeks[recentWeeks.length - 1],
    ),
    getWeekSummary({ userId: user.id, currency }, weekStart),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link
          href="/progress"
          className="group flex w-fit items-center gap-1.5 rounded-sm text-muted-foreground text-sm outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ArrowLeft
            className="size-4 transition-[translate] duration-150 group-hover:-translate-x-0.5"
            aria-hidden="true"
          />
          Progress
        </Link>
        <h1 className="page-title">Weekly Review</h1>
        <p className="text-muted-foreground text-xs">
          <span className="font-mono tabular-nums">
            {formatDateWithYear(range.from)} – {formatDateWithYear(range.to)}
          </span>{" "}
          · Sunday to Friday. Counts towards nothing but the habit itself.
        </p>
      </header>

      <ReviewWeekNav
        weekStart={weekStart}
        currentWeek={currentWeek}
        recentWeeks={recentWeeks}
        reviewedWeeks={reviewedWeeks}
      />

      {/* items-start so the summary keeps its own height beside the form. */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Keyed by week so a different week starts from its own text. */}
        <WeeklyReviewForm
          key={weekStart}
          weekStart={weekStart}
          review={review}
        />
        <WeekSummaryCard summary={summary} currency={currency} />
      </div>
    </div>
  );
}

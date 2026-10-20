import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { WeeklyReviewForm } from "@/components/progress/weekly-review-form";
import { getWeeklyReview } from "@/db/queries/weekly-reviews";
import { reviewWeekRange, reviewWeekStartOf } from "@/domain/review-week";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { formatDateWithYear, todayInTimeZone } from "@/lib/time";

export default async function WeeklyReviewPage() {
  const user = await getCurrentUser();

  // The review belongs to the user, not to an account, so the account
  // selector plays no part here. Which week is current is the user's own
  // calendar (users.timezone); trades fall into it by their trade date.
  const today = todayInTimeZone(user.timezone);
  const weekStart = reviewWeekStartOf(today);
  const range = reviewWeekRange(weekStart);
  const review = await getWeeklyReview(user.id, weekStart);

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

      <div className="max-w-2xl">
        {/* Keyed by week so a different week starts from its own text. */}
        <WeeklyReviewForm
          key={weekStart}
          weekStart={weekStart}
          review={review}
        />
      </div>
    </div>
  );
}

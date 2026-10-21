import { BadgeGrid } from "@/components/progress/badge-grid";
import { ScoreBreakdown } from "@/components/progress/score-breakdown";
import { ScoreHistory } from "@/components/progress/score-history";
import { StatusCard } from "@/components/progress/status-card";
import { StreakExplanation } from "@/components/progress/streak-explanation";
import { UnlockedCard } from "@/components/progress/unlocked-card";
import { WeeklyReviewLink } from "@/components/progress/weekly-review-link";
import { getBadgesSeenAt, listUserBadges } from "@/db/queries/badges";
import { getMonthScoreDays, getStreakEntryDays } from "@/db/queries/dashboard";
import { listMonthlyScores } from "@/db/queries/monthly-scores";
import { listReviewedWeekStarts } from "@/db/queries/weekly-reviews";
import { BADGE_DEFINITIONS } from "@/domain/badges";
import {
  calculateConsistencyScore,
  SCORE_WEIGHTS,
  tradingDaysElapsed,
} from "@/domain/consistency";
import { reviewWeekStartOf } from "@/domain/review-week";
import { calculateStreak } from "@/domain/streak";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { monthKeyOf, todayInTimeZone } from "@/lib/time";

export default async function ProgressPage() {
  const user = await getCurrentUser();

  const today = todayInTimeZone(user.timezone);
  const month = monthKeyOf(today);
  const currentWeek = reviewWeekStartOf(today);

  // Streak, score and badges see real accounts only (project-structure.md),
  // so none of these take the account switcher into account. Selecting a
  // practice account changes money figures, never process figures.
  const [
    streakDays,
    scoreDays,
    userBadges,
    badgesSeenAt,
    pastMonths,
    reviewedThisWeek,
  ] = await Promise.all([
    getStreakEntryDays(user.id),
    getMonthScoreDays(user.id, month),
    listUserBadges(user.id),
    getBadgesSeenAt(user.id),
    listMonthlyScores(user.id),
    listReviewedWeekStarts(user.id, currentWeek, currentWeek),
  ]);

  const streak = calculateStreak(streakDays, today, user.timezone);
  const score = calculateConsistencyScore(scoreDays, month, today);

  const elapsedTradingDays = tradingDaysElapsed(month, today).length;
  // showingUp is (logged days / elapsed days) * 40, so the day count comes
  // back out of it exactly — rather than re-deriving "which day counts" here
  // and letting a second copy of that rule drift from consistency.ts.
  const loggedDays =
    elapsedTradingDays === 0
      ? 0
      : Math.round(
          (score.showingUp / SCORE_WEIGHTS.showingUp) * elapsedTradingDays,
        );

  const earnedAt = new Map(
    userBadges.map((badge) => [badge.key, badge.earnedAt]),
  );

  // Awarding happens in the write paths, never here. This page only compares
  // what was written against the last time the user looked.
  const unlockedTitles = BADGE_DEFINITIONS.filter((badge) => {
    const earned = earnedAt.get(badge.key);
    if (earned === undefined) return false;
    return badgesSeenAt === null || earned > badgesSeenAt;
  }).map((badge) => badge.title);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="page-title">Progress</h1>
        <p className="text-fg-muted text-sm">
          Consistency, not P&amp;L. Nothing on this page ranks or rewards money.
        </p>
      </div>

      <UnlockedCard titles={unlockedTitles} />

      <StreakExplanation
        graceDayDate={streak.graceDayUsed ? streak.graceDayDate : null}
      >
        {/* Score first (Design.md §4.3, small form): the breakdown carries
            the score, so there is no consistency status card. items-start
            keeps the side column at its own height. */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <ScoreBreakdown
              score={score}
              loggedDays={loggedDays}
              elapsedTradingDays={elapsedTradingDays}
              hasEntriesThisMonth={scoreDays.length > 0}
            />
          </div>
          <div className="flex flex-col gap-4 lg:col-span-2">
            <StatusCard
              label="Logging streak"
              value={`${streak.current}d`}
              sub={`Longest ${streak.longest}d`}
            />
            <StatusCard
              label="Badges"
              value={String(userBadges.length)}
              sub={`of ${BADGE_DEFINITIONS.length}`}
            />
            <WeeklyReviewLink reviewed={reviewedThisWeek.length > 0} />
          </div>
        </div>
      </StreakExplanation>

      <ScoreHistory months={pastMonths} />

      <BadgeGrid earnedAt={earnedAt} timeZone={user.timezone} />
    </div>
  );
}

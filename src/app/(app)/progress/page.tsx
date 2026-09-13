import { BadgeGrid } from "@/components/progress/badge-grid";
import { ScoreBreakdown } from "@/components/progress/score-breakdown";
import { StreakCard } from "@/components/progress/streak-card";
import { UnlockedCard } from "@/components/progress/unlocked-card";
import { getBadgesSeenAt, listUserBadges } from "@/db/queries/badges";
import { getMonthScoreDays, getStreakEntryDays } from "@/db/queries/dashboard";
import { BADGE_DEFINITIONS } from "@/domain/badges";
import {
  calculateConsistencyScore,
  SCORE_WEIGHTS,
  tradingDaysElapsed,
} from "@/domain/consistency";
import { calculateStreak } from "@/domain/streak";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { monthKeyOf, todayInTimeZone } from "@/lib/time";

export default async function ProgressPage() {
  const user = await getCurrentUser();

  const today = todayInTimeZone(user.timezone);
  const month = monthKeyOf(today);

  // Streak, score and badges see real accounts only (project-structure.md),
  // so none of these take the account switcher into account. Selecting a
  // practice account changes money figures, never process figures.
  const [streakDays, scoreDays, userBadges, badgesSeenAt] = await Promise.all([
    getStreakEntryDays(user.id),
    getMonthScoreDays(user.id, month),
    listUserBadges(user.id),
    getBadgesSeenAt(user.id),
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

      {/* items-start so the streak card keeps its own height instead of being
          stretched to match the score card next to it. */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <StreakCard streak={streak} />
        <ScoreBreakdown
          score={score}
          loggedDays={loggedDays}
          elapsedTradingDays={elapsedTradingDays}
          hasEntriesThisMonth={scoreDays.length > 0}
        />
      </div>

      <BadgeGrid earnedAt={earnedAt} timeZone={user.timezone} />
    </div>
  );
}

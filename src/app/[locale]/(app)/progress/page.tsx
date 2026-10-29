import { getLocale } from "next-intl/server";
import {
  BadgeList,
  type ProgressBadge,
} from "@/components/progress/badge-list";
import { LoggedDaysHeatmap } from "@/components/progress/logged-days-heatmap";
import { MarkProgressSeen } from "@/components/progress/mark-progress-seen";
import { NextUp } from "@/components/progress/next-up";
import { ReviewCard } from "@/components/progress/review-card";
import { ScoreRing } from "@/components/progress/score-ring";
import { StreakColumn } from "@/components/progress/streak-column";
import { getBadgesSeenAt, listUserBadges } from "@/db/queries/badges";
import { getMonthScoreDays, getStreakEntryDays } from "@/db/queries/dashboard";
import { getProgressCounters, hasProgressMoment } from "@/db/queries/progress";
import {
  BADGE_DEFINITIONS,
  type BadgeProgress,
  badgeProgressOf,
  MONTH_END_BADGE_KEYS,
  nextUpBadges,
} from "@/domain/badges";
import {
  calculateConsistencyScore,
  SCORE_WEIGHTS,
  tradingDaysElapsed,
} from "@/domain/consistency";
import { heatmapWeeks } from "@/domain/progress";
import {
  RECENT_REVIEW_WEEK_COUNT,
  recentReviewWeeks,
  reviewWeekStartOf,
} from "@/domain/review-week";
import { calculateStreak } from "@/domain/streak";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  calendarDateOf,
  formatDateWithYear,
  monthKeyOf,
  todayInTimeZone,
} from "@/lib/time";

export default async function ProgressPage() {
  const [user, language] = await Promise.all([getCurrentUser(), getLocale()]);

  const today = todayInTimeZone(user.timezone);
  const month = monthKeyOf(today);
  const currentWeek = reviewWeekStartOf(today);
  const recentWeeks = recentReviewWeeks(currentWeek);

  // Streak, score and badges see real accounts only (project-structure.md),
  // so none of these take the account switcher into account. Selecting a
  // practice account changes money figures, never process figures.
  const [streakDays, scoreDays, userBadges, badgesSeenAt, counters, momentDue] =
    await Promise.all([
      getStreakEntryDays(user.id),
      getMonthScoreDays(user.id, month),
      listUserBadges(user.id),
      getBadgesSeenAt(user.id),
      getProgressCounters(user.id, {
        from: recentWeeks[0],
        to: currentWeek,
      }),
      hasProgressMoment(user.id),
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

  const weeks = heatmapWeeks({
    today,
    loggedDates: streakDays.map((day) => day.tradeDate),
    graceDays: streak.graceDays,
  });

  // The same numbers the badge sync awards from (src/lib/badges/sync.ts).
  const badgeProgress: BadgeProgress = {
    entriesLogged: counters.entriesLogged,
    reviewsWritten: counters.reviewsWritten,
    loggedTradingDays: streakDays.map((day) => day.tradeDate),
    longestStreak: streak.longest,
    byTheBookTrades: counters.byTheBookTrades,
    bestMonthlyScore: counters.bestMonthlyScore,
  };

  // Awarding happens in the write paths, never here. This page only compares
  // what was written against the last time the user looked.
  const earnedAt = new Map(
    userBadges.map((badge) => [badge.key, badge.earnedAt]),
  );
  const isNew = (earned: Date) =>
    badgesSeenAt === null || earned > badgesSeenAt;
  const badges: ProgressBadge[] = BADGE_DEFINITIONS.map((badge) => {
    const earned = earnedAt.get(badge.key);
    return {
      key: badge.key,
      category: badge.category,
      title: badge.title,
      description: badge.description,
      earnedOn: earned
        ? formatDateWithYear(calendarDateOf(earned, user.timezone), language)
        : null,
      isNew: earned !== undefined && isNew(earned),
      progress: badgeProgressOf(badge.key, badgeProgress),
      monthEnd: MONTH_END_BADGE_KEYS.includes(badge.key),
    };
  });
  const nextUpKeys = nextUpBadges(badgeProgress, [...earnedAt.keys()]);
  const nextUp = nextUpKeys.flatMap(
    (key) => badges.find((badge) => badge.key === key) ?? [],
  );
  // The moment's light sweeps the newest badge earned since the last visit.
  const sweepKey =
    userBadges
      .filter((badge) => isNew(badge.earnedAt))
      .sort((a, b) => b.earnedAt.getTime() - a.earnedAt.getTime())[0]?.key ??
    null;

  const reviewedThisWeek = counters.reviewedWeeks.includes(currentWeek);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="page-title">Progress</h1>
        <p className="text-muted-foreground text-sm">
          Consistency, not P&amp;L. Nothing on this page ranks or rewards money.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-6">
        <StreakColumn
          current={streak.current}
          longest={streak.longest}
          week={weeks[weeks.length - 1]}
          moment={momentDue}
        />
        <ScoreRing
          score={score}
          loggedDays={loggedDays}
          elapsedTradingDays={elapsedTradingDays}
        />
        <ReviewCard
          reviewedThisWeek={reviewedThisWeek}
          reviewedRecently={
            counters.reviewedWeeks.filter((week) => week !== currentWeek).length
          }
          recentWeekCount={RECENT_REVIEW_WEEK_COUNT}
        />
      </div>

      <NextUp badges={nextUp} />

      <LoggedDaysHeatmap weeks={weeks} moment={momentDue} />

      <BadgeList badges={badges} sweepKey={momentDue ? sweepKey : null} />

      <MarkProgressSeen due={momentDue} />
    </div>
  );
}

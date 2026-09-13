import { MetricPanel } from "@/components/dashboard/metric-panel";
import { PlanCard } from "@/components/dashboard/plan-card";
import { PnlCalendar } from "@/components/dashboard/pnl-calendar";
import { ProgressTiles } from "@/components/dashboard/progress-tiles";
import { TradeRow } from "@/components/journal/trade-row";
import { listUserBadges } from "@/db/queries/badges";
import { getDailyNote } from "@/db/queries/daily-notes";
import {
  type DayTotal,
  getMonthCountMetrics,
  getMonthDayTotals,
  getMonthMoneyMetrics,
  getMonthScoreDays,
  getStreakEntryDays,
} from "@/db/queries/dashboard";
import { listRecentTrades } from "@/db/queries/trades";
import { BADGE_DEFINITIONS } from "@/domain/badges";
import {
  calculateConsistencyScore,
  SCORE_WEIGHTS,
  tradingDaysElapsed,
} from "@/domain/consistency";
import { calculateStreak } from "@/domain/streak";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { monthKeyOf, todayInTimeZone } from "@/lib/time";

// Without this the page has no dynamic API in it, so Next prerenders it at
// build time and freezes every figure into the bundle. "Every number in this
// app is per-user and belongs at request time" (coding-standards.md) — that
// is what this line buys, and it is also why cacheComponents stays off.
export const dynamic = "force-dynamic";

const RECENT_TRADES_LIMIT = 5;

// Best and worst day are a pick from the day series the calendar already
// carries, not a second aggregate: the summing happened in SQL, and asking
// the database again for two rows it just returned would be the wasteful
// version of this.
function extremeDay(
  days: DayTotal[],
  pick: (candidate: number, best: number) => boolean,
): DayTotal | null {
  let found: DayTotal | null = null;
  for (const day of days) {
    if (found === null || pick(day.amountCents, found.amountCents)) {
      found = day;
    }
  }
  return found;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  // Every calendar boundary on this page is the user's own, never the
  // server's (coding-standards.md, Time).
  const today = todayInTimeZone(user.timezone);
  const month = monthKeyOf(today);
  const scope = {
    userId: user.id,
    selectedAccountId: user.selectedAccountId,
  };

  const [
    money,
    counts,
    dayTotals,
    streakDays,
    scoreDays,
    userBadges,
    note,
    recentTrades,
  ] = await Promise.all([
    getMonthMoneyMetrics(scope, month),
    getMonthCountMetrics(scope, month),
    getMonthDayTotals(scope, month),
    getStreakEntryDays(user.id),
    getMonthScoreDays(user.id, month),
    listUserBadges(user.id),
    getDailyNote(user.id, today),
    listRecentTrades(user.id, user.selectedAccountId, RECENT_TRADES_LIMIT),
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

  const todayTotal = dayTotals.days.find((day) => day.date === today);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="page-title">Welcome back, {user.displayName}</h1>

      {/* badgesEarned comes from `user_badges`, the same source /progress
          reads. Computing it live here instead would disagree with that page
          the moment a badge is earned but deliberately not awarded —
          score_90 is exactly that case until `monthly_scores` exists. */}
      <ProgressTiles
        currentStreak={streak.current}
        longestStreak={streak.longest}
        score={score.score}
        loggedDays={loggedDays}
        elapsedTradingDays={elapsedTradingDays}
        badgesEarned={userBadges.length}
        badgesTotal={BADGE_DEFINITIONS.length}
        hasEntriesThisMonth={scoreDays.length > 0}
      />

      <MetricPanel
        money={money}
        counts={counts}
        bestDay={extremeDay(dayTotals.days, (a, b) => a > b)}
        worstDay={extremeDay(dayTotals.days, (a, b) => a < b)}
        todayAmountCents={todayTotal?.amountCents ?? 0}
        maxDrawdownCents={dayTotals.maxDrawdownCents}
        currentStreak={streak.current}
        longestStreak={streak.longest}
        today={today}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PnlCalendar month={month} today={today} days={dayTotals.days} />
        <PlanCard
          premarketPlan={note?.premarketPlan ?? null}
          eodReview={note?.eodReview ?? null}
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="cap cap-neon">Recent trades</h2>
        {recentTrades.length === 0 ? (
          <p className="py-6 text-center text-fg-subtle text-sm">
            Nothing logged yet. A missed setup counts the same as a trade.
          </p>
        ) : (
          <div className="flex flex-col gap-[10px]">
            {recentTrades.map((trade) => (
              <TradeRow key={trade.id} trade={trade} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

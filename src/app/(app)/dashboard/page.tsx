import { EquityCurve } from "@/components/dashboard/equity-curve";
import { MetricPanel } from "@/components/dashboard/metric-panel";
import { MilestoneCard } from "@/components/dashboard/milestone-card";
import { PlanCard } from "@/components/dashboard/plan-card";
import { PnlCalendar } from "@/components/dashboard/pnl-calendar";
import { ProgressTiles } from "@/components/dashboard/progress-tiles";
import { TradeRow } from "@/components/journal/trade-row";
import { listUserBadges } from "@/db/queries/badges";
import { getDailyNote } from "@/db/queries/daily-notes";
import {
  type DayTotal,
  getDashboardRewardState,
  getDayTotals,
  getMoneyMetrics,
  getMonthCountMetrics,
  getMonthMoneyMetrics,
  getMonthScoreDays,
  getStartingBalanceCents,
  getStreakEntryDays,
} from "@/db/queries/dashboard";
import { withDisplayCurrency } from "@/db/queries/scope";
import { listRecentTrades } from "@/db/queries/trades";
import { BADGE_DEFINITIONS } from "@/domain/badges";
import {
  calculateConsistencyScore,
  SCORE_WEIGHTS,
  tradingDaysElapsed,
} from "@/domain/consistency";
import { buildEquitySeries } from "@/domain/equity";
import { calculateStreak, pendingStreakMilestone } from "@/domain/streak";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { firstValue } from "@/lib/search-params";
import { monthKeyOf, monthRangeOf, todayInTimeZone } from "@/lib/time";

const RECENT_TRADES_LIMIT = 5;

/**
 * `?month=YYYY-MM`, the calendar's own state. Anything else is ignored.
 *
 * The month part is pinned to 01–12 rather than to two digits: `2026-13`
 * looks like a month key, makes an Invalid Date out of `monthRangeOf`, and
 * took the page down with a 500 while the pattern still said "close enough".
 */
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();

  // Every calendar boundary on this page is the user's own, never the
  // server's (coding-standards.md, Time).
  const today = todayInTimeZone(user.timezone);
  const month = monthKeyOf(today);

  // The calendar pages on its own. Everything else on this page — the metric
  // panel, the consistency score, the streak — stays on the running month,
  // because the top of the dashboard answers "how is it going right now" and
  // a panel that silently followed the calendar would stop answering it.
  // The client only ever writes the YYYY-MM token; it is resolved and
  // validated here, against the user's own clock.
  const requestedMonth = firstValue((await searchParams).month);
  const calendarMonth =
    requestedMonth !== undefined && MONTH_PATTERN.test(requestedMonth)
      ? requestedMonth
      : month;

  // One display currency for every money figure on the page: the accounts'
  // own if they share one, else USD (display-currency).
  const scope = await withDisplayCurrency({
    userId: user.id,
    selectedAccountId: user.selectedAccountId,
  });

  const [
    money,
    counts,
    monthTotals,
    allTotals,
    streakDays,
    scoreDays,
    userBadges,
    note,
    recentTrades,
    rewards,
    startingBalanceCents,
    allTimeMoney,
  ] = await Promise.all([
    getMonthMoneyMetrics(scope, month),
    getMonthCountMetrics(scope, month),
    getDayTotals(scope, monthRangeOf(month)),
    getDayTotals(scope),
    getStreakEntryDays(user.id),
    getMonthScoreDays(user.id, month),
    listUserBadges(user.id),
    getDailyNote(user.id, today),
    listRecentTrades(
      user.id,
      user.selectedAccountId,
      RECENT_TRADES_LIMIT,
      scope.currency,
    ),
    getDashboardRewardState(user.id),
    getStartingBalanceCents(scope),
    getMoneyMetrics(scope),
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

  // Which milestone is due is a streak rule, so it lives in the domain module
  // with the rest of them — not inline here (src/domain/streak.ts).
  const milestone = pendingStreakMilestone(
    streak.current,
    rewards.milestoneSeen,
  );

  const todayTotal = monthTotals.days.find((day) => day.date === today);

  // The curve runs from the first trade to today and starts at the starting
  // balance of the scope's accounts, so its last point is the balance plus the
  // all-time result — the Net P&L in the panel above it (decided 2026-09-26,
  // net-pnl-all-time). Every other panel figure stays the running month.
  const equity = buildEquitySeries(allTotals.days, startingBalanceCents);

  // The calendar's month is a slice of the series the curve already has, not
  // a third query: picking the days of one month out of an ordered array is
  // a filter, not an aggregate, so "aggregate in SQL" stays intact.
  const calendarDays = allTotals.days.filter((day) =>
    day.date.startsWith(calendarMonth),
  );

  // How far the calendar may page. Forward stops at the running month;
  // backward stops at the month of the first trade, which is the first point
  // of the curve — no query of its own.
  const firstTradeMonth =
    equity.points.length === 0 ? null : monthKeyOf(equity.points[0].date);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="page-title ml-2">Welcome back, {user.displayName}</h1>

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
        bumpStreak={rewards.bumpStreak}
      />

      <MilestoneCard milestone={milestone} />

      <MetricPanel
        money={money}
        allTimeNetPnlCents={allTimeMoney.netPnlCents}
        counts={counts}
        bestDay={extremeDay(monthTotals.days, (a, b) => a > b)}
        worstDay={extremeDay(monthTotals.days, (a, b) => a < b)}
        todayAmountCents={todayTotal?.amountCents ?? 0}
        maxDrawdownCents={monthTotals.maxDrawdownCents}
        currentStreak={streak.current}
        longestStreak={streak.longest}
        today={today}
        currency={scope.currency}
      />

      <EquityCurve series={equity} currency={scope.currency} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PnlCalendar
          month={calendarMonth}
          today={today}
          days={calendarDays}
          currentMonth={month}
          firstTradeMonth={firstTradeMonth}
          currency={scope.currency}
        />
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
              <TradeRow
                key={trade.id}
                trade={trade}
                currency={scope.currency}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

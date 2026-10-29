import { DailyChecklistCard } from "@/components/dashboard/daily-checklist-card";
import { EquityCurve } from "@/components/dashboard/equity-curve";
import { MoneyMetrics } from "@/components/dashboard/money-metrics";
import { MonthCalendar } from "@/components/dashboard/month-calendar";
import { PlanCard } from "@/components/dashboard/plan-card";
import { ProcessMetrics } from "@/components/dashboard/process-metrics";
import { RecentEntries } from "@/components/dashboard/recent-entries";
import { RuleStatusCard } from "@/components/dashboard/rule-status-card";
import { SetupGuideCard } from "@/components/dashboard/setup-guide-card";
import { StreakPanel } from "@/components/dashboard/streak-panel";
import { listUserBadges } from "@/db/queries/badges";
import { getDailyChecklist } from "@/db/queries/checklist";
import { getDailyNote } from "@/db/queries/daily-notes";
import {
  type DayTotal,
  getCountMetrics,
  getDashboardRewardState,
  getDayTotals,
  getMoneyMetrics,
  getMonthScoreDays,
  getStartingBalanceCents,
  getStreakEntryDays,
} from "@/db/queries/dashboard";
import { withDisplayCurrency } from "@/db/queries/scope";
import { getSetupGuide } from "@/db/queries/setup-guide";
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
import { loadSelectedRuleStatus } from "@/lib/prop-firms/rule-status";
import { firstValue } from "@/lib/search-params";
import { monthKeyOf, todayInTimeZone } from "@/lib/time";

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

  // The calendar pages on its own. The metric panel reads the whole history
  // except its Today cell (decided 2026-09-26, dashboard-all-time); the
  // consistency score stays on the running month, which is what it measures.
  // Neither follows the calendar — a panel that silently changed with the
  // month on screen would stop saying what it says.
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
    allTotals,
    streakDays,
    scoreDays,
    userBadges,
    note,
    recentTrades,
    rewards,
    startingBalanceCents,
    ruleStatus,
    checklist,
    setupGuide,
  ] = await Promise.all([
    getMoneyMetrics(scope),
    getCountMetrics(scope),
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
    // Only for exactly one linked account; never against a combined figure.
    loadSelectedRuleStatus(user.id, user.selectedAccountId, today),
    // Same day as the plan; no account scope, practice flag or scoring input.
    getDailyChecklist(user.id, today),
    getSetupGuide(user.id),
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

  // Today is the one panel cell that is not all time, and a pick from the
  // day series like best and worst day — not a query of its own.
  const todayTotal = allTotals.days.find((day) => day.date === today);

  // The curve runs from the first trade to today and starts at the starting
  // balance of the scope's accounts, so its last point is the balance plus the
  // all-time result — the Net P&L in the panel above it (decided 2026-09-26,
  // net-pnl-all-time).
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

  // Design.md §3.2: the month fills the main area and the page reads from
  // month to detail; the process sits in the right column beside it.
  return (
    <div className="flex flex-col gap-6">
      {/* Above everything else, and only while the rules show it. */}
      {setupGuide.kind !== "hidden" && <SetupGuideCard view={setupGuide} />}
      <div className="grid xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6 xl:border-r xl:pr-6">
          <MonthCalendar
            month={calendarMonth}
            today={today}
            days={calendarDays}
            currentMonth={month}
            firstTradeMonth={firstTradeMonth}
            currency={scope.currency}
          />

          {ruleStatus && <RuleStatusCard ruleStatus={ruleStatus} />}

          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <MoneyMetrics
              money={money}
              counts={counts}
              bestDay={extremeDay(allTotals.days, (a, b) => a > b)}
              worstDay={extremeDay(allTotals.days, (a, b) => a < b)}
              todayAmountCents={todayTotal?.amountCents ?? 0}
              maxDrawdownCents={allTotals.maxDrawdownCents}
              today={today}
              currency={scope.currency}
            />
            <EquityCurve series={equity} currency={scope.currency} />
          </div>

          <RecentEntries trades={recentTrades} currency={scope.currency} />
        </div>

        <aside
          aria-label="Process"
          className="mt-8 flex flex-col gap-6 border-t pt-6 xl:mt-0 xl:border-t-0 xl:pt-0 xl:pl-6 [&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:pb-6"
        >
          <StreakPanel
            currentStreak={streak.current}
            longestStreak={streak.longest}
            bumpStreak={rewards.bumpStreak}
            milestone={milestone}
          />
          {/* badgesEarned comes from `user_badges`, the same source /progress
            reads. Computing it live here instead would disagree with that
            page whenever the numbers are ahead of the write paths — score_90,
            for one, arrives with the first write after a month is frozen. */}
          <ProcessMetrics
            score={score.score}
            loggedDays={loggedDays}
            elapsedTradingDays={elapsedTradingDays}
            hasEntriesThisMonth={scoreDays.length > 0}
            badgesEarned={userBadges.length}
            badgesTotal={BADGE_DEFINITIONS.length}
            byTheBook={counts.byTheBook}
            tradesLogged={counts.tradesLogged}
            missedSetups={counts.missedSetups}
          />
          <PlanCard
            premarketPlan={note?.premarketPlan ?? null}
            eodReview={note?.eodReview ?? null}
          />
          <DailyChecklistCard items={checklist} />
        </aside>
      </div>
    </div>
  );
}

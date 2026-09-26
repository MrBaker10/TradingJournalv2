import { MetricCell } from "@/components/dashboard/metric-cell";
import type {
  DayTotal,
  MonthCountMetrics,
  MonthMoneyMetrics,
} from "@/db/queries/dashboard";
import type { IsoDate } from "@/domain/streak";
import { type DisplayCurrency, formatCents } from "@/lib/money";
import { formatDayLabel } from "@/lib/time";

interface MetricPanelProps {
  money: MonthMoneyMetrics;
  /** Net P&L since the first trade in the scope — the one all-time cell. */
  allTimeNetPnlCents: number;
  counts: MonthCountMetrics;
  bestDay: DayTotal | null;
  worstDay: DayTotal | null;
  todayAmountCents: number;
  maxDrawdownCents: number;
  currentStreak: number;
  longestStreak: number;
  today: IsoDate;
  /** The display currency of the figures (display-currency). */
  currency: DisplayCurrency;
}

const EMPTY = "—";

function money(cents: number | null, currency: DisplayCurrency): string {
  return cents === null
    ? EMPTY
    : formatCents(cents, { signed: true, currency });
}

function ratio(value: number | null, digits: number): string {
  return value === null ? EMPTY : value.toFixed(digits);
}

// Design.md §4.7: one card, a four-column grid, fifteen cells — not fifteen
// floating cards. Thirteen identical cards create no hierarchy, and you end
// up hunting every number one at a time.
//
// The figures arrive finished from src/db/queries/dashboard.ts. Nothing here
// adds, multiplies or divides money; this file only decides how a number is
// written and which of the three treatments it gets.
export function MetricPanel({
  money: moneyMetrics,
  allTimeNetPnlCents,
  counts,
  bestDay,
  worstDay,
  todayAmountCents,
  maxDrawdownCents,
  currentStreak,
  longestStreak,
  today,
  currency,
}: MetricPanelProps) {
  return (
    <section className="card-surface edge overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCell
          label="Net P&L"
          value={money(allTimeNetPnlCents, currency)}
          context="All time"
          tone="money"
          sign={allTimeNetPnlCents}
        />
        <MetricCell
          label="Win rate"
          value={
            counts.winRate === null
              ? EMPTY
              : `${Math.round(counts.winRate * 100)}%`
          }
          context={
            counts.tradesLogged > 0
              ? `Of ${counts.tradesLogged} taken`
              : "Nothing logged this month yet"
          }
          tone="neutral"
        />
        <MetricCell
          label="Trades logged"
          value={String(counts.tradesLogged)}
          context="This month"
          tone="neutral"
        />
        <MetricCell
          label="Profit factor"
          value={ratio(moneyMetrics.profitFactor, 2)}
          context={
            moneyMetrics.profitFactor === null
              ? "No losing trades yet"
              : "Gross win over gross loss"
          }
          tone="neutral"
        />
        <MetricCell
          label="Expectancy"
          value={money(moneyMetrics.expectancyCents, currency)}
          context="Per trade"
          tone="money"
          sign={moneyMetrics.expectancyCents ?? 0}
        />
        <MetricCell
          label="Max drawdown"
          value={
            maxDrawdownCents > 0
              ? formatCents(-maxDrawdownCents, { currency })
              : EMPTY
          }
          context="From equity peak"
          tone="money"
          sign={-maxDrawdownCents}
        />
        <MetricCell
          label="Avg winner"
          value={money(moneyMetrics.avgWinnerCents, currency)}
          context={
            moneyMetrics.avgWinnerCents === null
              ? "No winning trades yet"
              : "Per trade"
          }
          tone="money"
          sign={moneyMetrics.avgWinnerCents ?? 0}
        />
        <MetricCell
          label="Avg loser"
          value={money(moneyMetrics.avgLoserCents, currency)}
          context={
            moneyMetrics.avgLoserCents === null
              ? "No losing trades yet"
              : "Per trade"
          }
          tone="money"
          sign={moneyMetrics.avgLoserCents ?? 0}
        />
        <MetricCell
          label="Avg R"
          value={counts.avgR === null ? EMPTY : `${ratio(counts.avgR, 2)}R`}
          context="Per trade"
          tone="neutral"
        />
        <MetricCell
          label="Current streak"
          value={`${currentStreak}d`}
          context={`Longest ${longestStreak}d`}
          tone="process"
        />
        <MetricCell
          label="Best day"
          value={
            bestDay === null ? EMPTY : money(bestDay.amountCents, currency)
          }
          context={bestDay === null ? undefined : formatDayLabel(bestDay.date)}
          tone="money"
          sign={bestDay?.amountCents ?? 0}
        />
        <MetricCell
          label="Worst day"
          value={
            worstDay === null ? EMPTY : money(worstDay.amountCents, currency)
          }
          context={
            worstDay === null ? undefined : formatDayLabel(worstDay.date)
          }
          tone="money"
          sign={worstDay?.amountCents ?? 0}
        />
        <MetricCell
          label="Today"
          value={money(todayAmountCents, currency)}
          context={formatDayLabel(today)}
          tone="money"
          sign={todayAmountCents}
          highlight
        />
        <MetricCell
          label="Missed setups"
          value={String(counts.missedSetups)}
          context="This month"
          tone="process"
        />
        <MetricCell
          label="By the book"
          value={String(counts.byTheBook)}
          context={`Of ${counts.tradesLogged} taken`}
          tone="process"
        />
      </div>
    </section>
  );
}

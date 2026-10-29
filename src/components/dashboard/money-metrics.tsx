import { useLocale } from "next-intl";
import type {
  CountMetrics,
  DayTotal,
  MoneyMetrics as MoneyMetricsData,
} from "@/db/queries/dashboard";
import type { IsoDate } from "@/domain/streak";
import { moneyTone } from "@/lib/dashboard/sign-tone";
import type { Language } from "@/lib/i18n/languages";
import { type DisplayCurrency, formatCents } from "@/lib/money";
import { formatFixed, formatPercent } from "@/lib/numbers";
import { formatDayLabel } from "@/lib/time";
import { MetricRow } from "./metric-row";

interface MoneyMetricsProps {
  /** Since the first trade in the scope, like every row but Today. */
  money: MoneyMetricsData;
  counts: CountMetrics;
  bestDay: DayTotal | null;
  worstDay: DayTotal | null;
  todayAmountCents: number;
  maxDrawdownCents: number;
  today: IsoDate;
  /** The display currency of the figures (display-currency). */
  currency: DisplayCurrency;
}

const EMPTY = "—";

function money(
  cents: number | null,
  currency: DisplayCurrency,
  language: Language,
): string {
  return cents === null
    ? EMPTY
    : formatCents(cents, { signed: true, currency, language });
}

/**
 * The money metrics under the calendar (Design.md §3.2): a mono key/value
 * list, so the figures align as a column. Money carries its sign colour and
 * nothing else; counts and ratios stay plain.
 *
 * The figures arrive finished from src/db/queries/dashboard.ts. Nothing here
 * adds, multiplies or divides money; this file only decides how a number is
 * written.
 */
export function MoneyMetrics({
  money: metrics,
  counts,
  bestDay,
  worstDay,
  todayAmountCents,
  maxDrawdownCents,
  today,
  currency,
}: MoneyMetricsProps) {
  const language = useLocale();
  return (
    <section aria-label="Money metrics">
      <dl className="font-mono text-[13px]">
        <MetricRow
          label="Net P&L"
          note="all time"
          tone={moneyTone(metrics.netPnlCents)}
        >
          {money(metrics.netPnlCents, currency, language)}
        </MetricRow>
        <MetricRow
          label="Today"
          note={formatDayLabel(today, language)}
          tone={moneyTone(todayAmountCents)}
        >
          {money(todayAmountCents, currency, language)}
        </MetricRow>
        <MetricRow
          label="Win rate"
          note={
            counts.tradesLogged > 0
              ? `of ${counts.tradesLogged} taken`
              : undefined
          }
        >
          {counts.winRate === null
            ? EMPTY
            : formatPercent(counts.winRate, language)}
        </MetricRow>
        <MetricRow label="Trades logged" note="all time">
          {String(counts.tradesLogged)}
        </MetricRow>
        <MetricRow label="Avg R">
          {counts.avgR === null
            ? EMPTY
            : `${formatFixed(counts.avgR, 2, language)}R`}
        </MetricRow>
        <MetricRow label="Expectancy" tone={moneyTone(metrics.expectancyCents)}>
          {money(metrics.expectancyCents, currency, language)}
        </MetricRow>
        <MetricRow label="Profit factor">
          {metrics.profitFactor === null
            ? EMPTY
            : formatFixed(metrics.profitFactor, 2, language)}
        </MetricRow>
        <MetricRow label="Avg winner" tone={moneyTone(metrics.avgWinnerCents)}>
          {money(metrics.avgWinnerCents, currency, language)}
        </MetricRow>
        <MetricRow label="Avg loser" tone={moneyTone(metrics.avgLoserCents)}>
          {money(metrics.avgLoserCents, currency, language)}
        </MetricRow>
        <MetricRow
          label="Best day"
          note={bestDay ? formatDayLabel(bestDay.date, language) : undefined}
          tone={moneyTone(bestDay?.amountCents ?? null)}
        >
          {money(bestDay?.amountCents ?? null, currency, language)}
        </MetricRow>
        <MetricRow
          label="Worst day"
          note={worstDay ? formatDayLabel(worstDay.date, language) : undefined}
          tone={moneyTone(worstDay?.amountCents ?? null)}
        >
          {money(worstDay?.amountCents ?? null, currency, language)}
        </MetricRow>
        <MetricRow label="Max drawdown" tone={moneyTone(-maxDrawdownCents)}>
          {maxDrawdownCents > 0
            ? formatCents(-maxDrawdownCents, { currency, language })
            : EMPTY}
        </MetricRow>
      </dl>
    </section>
  );
}

import { TermInfo } from "@/components/terms/term-info";
import { MetricRow } from "./metric-row";

interface ProcessMetricsProps {
  score: number;
  loggedDays: number;
  elapsedTradingDays: number;
  /** No entry this month yet — the score explains itself instead of a day count. */
  hasEntriesThisMonth: boolean;
  badgesEarned: number;
  badgesTotal: number;
  byTheBook: number;
  tradesLogged: number;
  missedSetups: number;
}

/**
 * The process metrics beside the month (Design.md §3.2), the figure in the
 * process colour. Consistency, logged days and badges see real accounts only,
 * whatever the account selector says; by the book, the taken count and missed
 * setups are counted in the selected scope, as on the dashboard before.
 */
export function ProcessMetrics({
  score,
  loggedDays,
  elapsedTradingDays,
  hasEntriesThisMonth,
  badgesEarned,
  badgesTotal,
  byTheBook,
  tradesLogged,
  missedSetups,
}: ProcessMetricsProps) {
  return (
    <section aria-label="Process metrics" className="text-sm">
      <dl>
        <MetricRow
          label="Consistency"
          info={<TermInfo term="consistencyScore" />}
          tone="text-process"
        >
          {score}
          <span className="text-muted-foreground">/100</span>
        </MetricRow>
        {hasEntriesThisMonth && (
          <MetricRow label="Logged days" tone="text-process">
            {loggedDays}
            <span className="text-muted-foreground">/{elapsedTradingDays}</span>
          </MetricRow>
        )}
        <MetricRow label="Badges" tone="text-process">
          {badgesEarned}
          <span className="text-muted-foreground">/{badgesTotal}</span>
        </MetricRow>
        <MetricRow label="By the book" note="of taken" tone="text-process">
          {byTheBook}
          <span className="text-muted-foreground">/{tradesLogged}</span>
        </MetricRow>
        <MetricRow label="Missed setups" note="all time" tone="text-process">
          {missedSetups}
        </MetricRow>
      </dl>
      {!hasEntriesThisMonth && (
        <p className="mt-2 text-muted-foreground text-xs">
          Log a trade — taken or missed — and this month&apos;s score starts
          building.
        </p>
      )}
    </section>
  );
}

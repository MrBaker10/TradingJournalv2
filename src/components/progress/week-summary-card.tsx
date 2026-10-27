import { MetricRow } from "@/components/dashboard/metric-row";
import type { WeekSummary } from "@/db/queries/weekly-reviews";
import { TRADING_DAYS_PER_REVIEW_WEEK } from "@/domain/review-week";
import { type DisplayCurrency, formatCents } from "@/lib/money";

function byTheBookShare(summary: WeekSummary): string {
  if (summary.takenTrades === 0) return "—";
  return `${Math.round((summary.byTheBookTrades / summary.takenTrades) * 100)}%`;
}

/**
 * The week's numbers beside the review (Design.md §3.13), read-only, as a mono
 * key/value list like the dashboard's money metrics. Process figures are in
 * `process`; net P&L is a neutral figure here — shown, not the point of a
 * review. The figure arrives finished; nothing here does money arithmetic.
 */
export function WeekSummaryCard({
  summary,
  currency,
}: {
  summary: WeekSummary;
  currency: DisplayCurrency;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
        The week in numbers
      </h2>

      {summary.loggedDays === 0 ? (
        <p className="text-muted-foreground text-sm">
          No entries this week. A week off is worth a review too.
        </p>
      ) : (
        <>
          <dl className="text-[13px]">
            <MetricRow
              label="Logged days"
              note={`of ${TRADING_DAYS_PER_REVIEW_WEEK}`}
              tone="text-process"
            >
              {summary.loggedDays}
            </MetricRow>
            <MetricRow
              label="By the book"
              note={`${summary.byTheBookTrades} of ${summary.takenTrades} taken`}
              tone="text-process"
            >
              {byTheBookShare(summary)}
            </MetricRow>
            <MetricRow label="Missed setups" tone="text-process">
              {summary.missedSetups}
            </MetricRow>
            <MetricRow label="Net P&L" note="all real accounts">
              {formatCents(summary.netPnlCents, { signed: true, currency })}
            </MetricRow>
          </dl>

          <div className="flex flex-col gap-1">
            <h3 className="font-medium text-muted-foreground text-xs">
              Top mistakes
            </h3>
            {summary.topMistakes.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No mistakes tagged.
              </p>
            ) : (
              <dl className="text-[13px]">
                {summary.topMistakes.map((mistake) => (
                  <MetricRow key={mistake.label} label={mistake.label}>
                    {mistake.count}×
                  </MetricRow>
                ))}
              </dl>
            )}
          </div>
        </>
      )}
    </section>
  );
}

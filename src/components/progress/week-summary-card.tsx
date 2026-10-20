import { MetricCell } from "@/components/dashboard/metric-cell";
import type { WeekSummary } from "@/db/queries/weekly-reviews";
import { TRADING_DAYS_PER_REVIEW_WEEK } from "@/domain/review-week";
import { type DisplayCurrency, formatCents } from "@/lib/money";

function byTheBookShare(summary: WeekSummary): string {
  if (summary.takenTrades === 0) return "—";
  return `${Math.round((summary.byTheBookTrades / summary.takenTrades) * 100)}%`;
}

// Design.md §4.26: the week's numbers beside the review, read-only. The
// process values glow like the metric panel's (§4.7); Net P&L is the one
// money cell and gets the semantic colour and nothing else — shown, not the
// point. The figure arrives finished; nothing here does money arithmetic.
export function WeekSummaryCard({
  summary,
  currency,
}: {
  summary: WeekSummary;
  currency: DisplayCurrency;
}) {
  return (
    <section className="card-surface edge-neon flex flex-col gap-4 p-5">
      <h2 className="cap cap-neon">The week in numbers</h2>

      {summary.loggedDays === 0 ? (
        <p className="py-6 text-center text-fg-subtle text-sm">
          No entries this week. A week off is worth a review too.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2">
            <MetricCell
              label="Logged days"
              value={String(summary.loggedDays)}
              context={`Of ${TRADING_DAYS_PER_REVIEW_WEEK} trading days`}
              tone="process"
            />
            <MetricCell
              label="By the book"
              value={byTheBookShare(summary)}
              context={`${summary.byTheBookTrades} of ${summary.takenTrades} taken`}
              tone="process"
            />
            <MetricCell
              label="Missed setups"
              value={String(summary.missedSetups)}
              tone="process"
            />
            <MetricCell
              label="Net P&L"
              value={formatCents(summary.netPnlCents, {
                signed: true,
                currency,
              })}
              context="All real accounts"
              tone="money"
              sign={summary.netPnlCents}
            />
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="cap">Top mistakes</h3>
            {summary.topMistakes.length === 0 ? (
              <p className="text-fg-subtle text-sm">No mistakes tagged.</p>
            ) : (
              <ol className="flex flex-col gap-1.5">
                {summary.topMistakes.map((mistake) => (
                  <li
                    key={mistake.label}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="text-fg">{mistake.label}</span>
                    <span className="font-mono text-fg-muted tabular-nums">
                      {mistake.count}×
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </>
      )}
    </section>
  );
}

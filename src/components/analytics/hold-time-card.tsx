import type { ExecutionSummaryRow } from "@/db/queries/analytics";
import { formatHoldTime, OUTCOME_LABELS, OUTCOMES } from "@/domain/execution";

interface HoldTimeCardProps {
  summary: ExecutionSummaryRow[];
}

// How long the user sits in a trade, split by outcome — the question being
// whether winners are cut as fast as losers are held.
//
// No money figure appears here, and none of these numbers is coloured by
// outcome: a longer hold is neither good nor bad on its own, and a semantic
// colour would claim otherwise.
export function HoldTimeCard({ summary }: HoldTimeCardProps) {
  const rows = OUTCOMES.map((outcome) => ({
    outcome,
    row: summary.find((entry) => entry.outcome === outcome),
  })).filter((entry) => (entry.row?.holdTrades ?? 0) > 0);

  return (
    <section className="flex flex-col gap-3">
      <div className="ml-2 flex flex-col gap-1">
        <h2 className="cap cap-neon">Hold time</h2>
        <p className="text-[11.5px] text-fg-subtle">
          Entry to exit on your chart clock. An exit earlier than the entry is
          read as an overnight trade, not a negative duration.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="card-surface edge flex flex-col gap-3 p-5">
          {rows.length === 0 ? (
            <p className="py-4 text-center text-fg-subtle text-sm">
              No trade with an exit in this range yet.
            </p>
          ) : (
            <>
              <div className="flex items-baseline justify-between gap-3 border-white/8 border-b pb-1.5">
                <span className="cap">Outcome</span>
                <span className="flex shrink-0 gap-3">
                  <span className="cap w-20 text-right">Avg held</span>
                  <span className="cap w-12 text-right">Trades</span>
                </span>
              </div>

              <ul className="flex flex-col divide-y divide-white/6">
                {rows.map(({ outcome, row }) => (
                  <li
                    key={outcome}
                    className="flex items-baseline justify-between gap-3 py-2"
                  >
                    <span className="truncate text-fg text-sm">
                      {OUTCOME_LABELS[outcome]}
                    </span>
                    <span className="flex shrink-0 items-baseline gap-3 font-mono text-[13px] tabular-nums">
                      <span className="w-20 text-right text-fg">
                        {formatHoldTime(row?.holdMinutes ?? null)}
                      </span>
                      <span className="w-12 text-right text-fg-muted">
                        {row?.holdTrades ?? 0}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

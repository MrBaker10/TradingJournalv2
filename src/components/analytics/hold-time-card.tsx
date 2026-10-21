import {
  type BucketColumn,
  BucketHeader,
  BucketRow,
} from "@/components/analytics/bucket-table";
import type { ExecutionSummaryRow } from "@/db/queries/analytics";
import { formatHoldTime, OUTCOME_LABELS, OUTCOMES } from "@/domain/execution";

interface HoldTimeCardProps {
  summary: ExecutionSummaryRow[];
}

const COLUMNS: BucketColumn[] = [
  { label: "Avg held", width: "sm:w-20" },
  { label: "Trades", width: "sm:w-12" },
];

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
              <BucketHeader bucketLabel="Outcome" columns={COLUMNS} />

              <ul className="flex flex-col divide-y divide-white/6">
                {rows.map(({ outcome, row }) => (
                  <BucketRow
                    key={outcome}
                    label={OUTCOME_LABELS[outcome]}
                    columns={COLUMNS}
                    cells={[
                      {
                        text: formatHoldTime(row?.holdMinutes ?? null),
                        tone: "text-fg",
                      },
                      {
                        text: String(row?.holdTrades ?? 0),
                        tone: "text-fg-muted",
                      },
                    ]}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

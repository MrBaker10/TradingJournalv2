import { ValueBar } from "@/components/ui/value-bar";
import type { ExecutionSummaryRow } from "@/db/queries/analytics";
import {
  buildExcursionRows,
  type ExcursionCount,
  type ExcursionKind,
  OUTCOME_LABELS,
  OUTCOMES,
  type Outcome,
} from "@/domain/execution";

interface RiskCalibrationCardProps {
  summary: ExecutionSummaryRow[];
  excursions: ExcursionCount[];
}

const KIND_TITLES: Record<ExcursionKind, string> = {
  mae: "Adverse excursion (MAE)",
  mfe: "Favourable excursion (MFE)",
};

const KINDS: ExcursionKind[] = ["mae", "mfe"];

function average(
  summary: ExecutionSummaryRow[],
  outcome: Outcome,
  kind: ExcursionKind,
): { value: number | null; trades: number } {
  const row = summary.find((entry) => entry.outcome === outcome);
  return kind === "mae"
    ? { value: row?.avgMaeR ?? null, trades: row?.maeTrades ?? 0 }
    : { value: row?.avgMfeR ?? null, trades: row?.mfeTrades ?? 0 };
}

function Card({
  kind,
  outcome,
  summary,
  excursions,
}: {
  kind: ExcursionKind;
  outcome: Outcome;
  summary: ExecutionSummaryRow[];
  excursions: ExcursionCount[];
}) {
  const rows = buildExcursionRows(kind, outcome, excursions);
  const { value, trades } = average(summary, outcome, kind);

  return (
    <section className="card-surface edge flex flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="cap">
          {KIND_TITLES[kind]} — {OUTCOME_LABELS[outcome].toLowerCase()}
        </h3>
        {/* Neither an MAE nor an MFE is a realised figure, so the average
            stays plain white — Design.md §1 and §4.9. */}
        <span className="font-mono text-fg text-sm tabular-nums">
          {value === null ? "—" : `${value.toFixed(2)}R`}
          <span className="ml-1.5 text-[11.5px] text-fg-subtle">
            avg over {trades}
          </span>
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="py-4 text-center text-fg-subtle text-sm">
          No {kind.toUpperCase()} recorded on these trades.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/6">
          {rows.map((row) => (
            <li key={row.label} className="flex flex-col gap-1.5 py-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-fg text-sm">{row.label}</span>
                <span className="flex shrink-0 items-baseline gap-3 font-mono text-[13px] tabular-nums">
                  <span className="w-8 text-right text-fg">{row.trades}</span>
                  <span className="w-12 text-right text-fg-muted">
                    {Math.round(row.share * 100)}%
                  </span>
                </span>
              </div>
              <ValueBar ratio={row.barRatio} tone="process" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// The classic MAE study: how far did the winners go against you before they
// worked, and how far did the losers run for you before they turned. The first
// answers "how much stop do I actually need", the second "how much did I give
// back".
//
// Both are process values — they say nothing about money earned — so the bars
// carry the same neon fill as the consistency score, and no figure here is
// ever tinted green or red.
export function RiskCalibrationCard({
  summary,
  excursions,
}: RiskCalibrationCardProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="ml-2 flex flex-col gap-1">
        <h2 className="cap cap-neon">Risk calibration</h2>
        <p className="text-[11.5px] text-fg-subtle">
          MAE is counted by magnitude, whichever sign you type. Winners that
          never went far against you mean a tighter stop was available.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {KINDS.flatMap((kind) =>
          OUTCOMES.map((outcome) => (
            <Card
              key={`${kind}-${outcome}`}
              kind={kind}
              outcome={outcome}
              summary={summary}
              excursions={excursions}
            />
          )),
        )}
      </div>
    </section>
  );
}

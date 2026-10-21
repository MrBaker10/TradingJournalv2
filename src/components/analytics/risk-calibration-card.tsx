import {
  type BucketColumn,
  BucketHeader,
  BucketRow,
} from "@/components/analytics/bucket-table";
import { EmptySection } from "@/components/analytics/empty-section";
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

// No header from `sm` up (the card title says what is counted); below it the
// two-line rows get one label line, so "4 · 33%" can be read.
const COLUMNS: BucketColumn[] = [
  { label: "Trades", width: "sm:w-8" },
  { label: "Share", width: "sm:w-12" },
];

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
        <>
          <BucketHeader bucketLabel="Bucket" columns={COLUMNS} narrowOnly />

          <ul className="flex flex-col divide-y divide-white/6">
            {rows.map((row) => (
              <BucketRow
                key={row.label}
                label={row.label}
                columns={COLUMNS}
                cells={[
                  { text: String(row.trades), tone: "text-fg" },
                  {
                    text: `${Math.round(row.share * 100)}%`,
                    tone: "text-fg-muted",
                  },
                ]}
                bar={<ValueBar ratio={row.barRatio} tone="process" />}
              />
            ))}
          </ul>
        </>
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
  // Only when none of the four cards has a bucket does the section shrink to
  // one line; with any data the empty cards beside it stay, because there the
  // gap is the finding.
  const nothingRecorded = KINDS.every((kind) =>
    OUTCOMES.every(
      (outcome) => buildExcursionRows(kind, outcome, excursions).length === 0,
    ),
  );
  if (nothingRecorded) {
    return (
      <EmptySection title="Risk calibration">
        No MAE or MFE recorded in this range.
      </EmptySection>
    );
  }

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

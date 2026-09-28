import type { MonthlyScoreRow } from "@/db/queries/monthly-scores";
import { SCORE_WEIGHTS } from "@/domain/consistency";
import { formatMonthLabel } from "@/lib/time";

interface ScoreHistoryProps {
  /** Frozen months, newest first (`listMonthlyScores`). */
  months: MonthlyScoreRow[];
}

type PartKey = "showingUp" | "completeness" | "planAdherence" | "reviewHabit";

// Same labels as the live breakdown next door, so a month reads the same
// before and after it is frozen.
const PARTS: { key: PartKey; label: string; possible: number }[] = [
  { key: "showingUp", label: "Showing up", possible: SCORE_WEIGHTS.showingUp },
  {
    key: "completeness",
    label: "Journaling",
    possible: SCORE_WEIGHTS.completeness,
  },
  {
    key: "planAdherence",
    label: "Adherence",
    possible: SCORE_WEIGHTS.planAdherence,
  },
  { key: "reviewHabit", label: "Review", possible: SCORE_WEIGHTS.reviewHabit },
];

/**
 * A `numeric(7,4)` part as one decimal, rounded half up, by string and
 * integer work only — "27.3684" becomes "27.4". Parts are never negative.
 */
function formatPart(value: string): string {
  const [whole, fraction = ""] = value.split(".");
  const tenThousandths =
    Number(whole) * 10_000 + Number(fraction.padEnd(4, "0").slice(0, 4));
  const tenths = Math.floor((tenThousandths + 500) / 1_000);
  return `${Math.floor(tenths / 10)}.${tenths % 10}`;
}

// Design.md §4.24. The score is process, so the card carries the neon edge
// and the score glows, like the live breakdown (§4.3). The row layout is the
// one from §4.16. Below `sm` only month and score remain.
export function ScoreHistory({ months }: ScoreHistoryProps) {
  return (
    <section className="card-surface edge-neon flex flex-col gap-3 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="cap cap-neon">Past months</h2>
        <p className="text-[11.5px] text-fg-subtle">
          Frozen two days after a month ends, so a late entry for its last day
          still counts.
        </p>
      </div>

      {months.length === 0 ? (
        <p className="py-4 text-center text-fg-subtle text-sm">
          Your first month appears here once it is over.
        </p>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-3 border-white/8 border-b pb-1.5">
            <span className="cap">Month</span>
            <span className="flex shrink-0 gap-3">
              <span className="cap w-12 text-right">Score</span>
              {PARTS.map((part) => (
                <span
                  key={part.key}
                  className="cap hidden w-24 text-right sm:inline"
                >
                  {part.label}
                </span>
              ))}
            </span>
          </div>

          <ul className="flex flex-col divide-y divide-white/6">
            {months.map((row) => (
              <li
                key={row.month}
                className="flex items-baseline justify-between gap-3 py-2"
              >
                <span className="truncate text-fg text-sm">
                  {formatMonthLabel(row.month)}
                </span>
                <span className="flex shrink-0 items-baseline gap-3 font-mono text-[13px] tabular-nums">
                  <span className="text-glow w-12 text-right font-bold">
                    {row.score}
                  </span>
                  {PARTS.map((part) => (
                    <span
                      key={part.key}
                      className="hidden w-24 text-right text-fg-muted sm:inline"
                    >
                      {formatPart(row[part.key])}
                      <span className="text-fg-subtle"> / {part.possible}</span>
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

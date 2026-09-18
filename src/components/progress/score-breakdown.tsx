import { ValueBar } from "@/components/ui/value-bar";
import type { ConsistencyScore } from "@/domain/consistency";
import { SCORE_WEIGHTS } from "@/domain/consistency";

interface ScoreBreakdownProps {
  score: ConsistencyScore;
  loggedDays: number;
  elapsedTradingDays: number;
  /** Nothing logged this month — Design.md §7 wants a sentence, not four zeros. */
  hasEntriesThisMonth: boolean;
}

interface Part {
  label: string;
  earned: number;
  possible: number;
  hint: string;
}

// The score is process through and through — no part of it can be moved by
// P&L, win rate or R. That is exactly why this card is allowed to carry the
// neon edge and the glowing total.
function partsOf(score: ConsistencyScore): Part[] {
  return [
    {
      label: "Showing up",
      earned: score.showingUp,
      possible: SCORE_WEIGHTS.showingUp,
      hint: "Trading days you logged something on",
    },
    {
      label: "Journaling",
      earned: score.completeness,
      possible: SCORE_WEIGHTS.completeness,
      hint: "Entries with notes, grade, felt, a confluence and a screenshot or link",
    },
    {
      label: "Plan adherence",
      earned: score.planAdherence,
      possible: SCORE_WEIGHTS.planAdherence,
      hint: "Taken trades you marked by the book",
    },
    {
      label: "Review habit",
      earned: score.reviewHabit,
      possible: SCORE_WEIGHTS.reviewHabit,
      hint: "Logged days that got an end-of-day review",
    },
  ];
}

export function ScoreBreakdown({
  score,
  loggedDays,
  elapsedTradingDays,
  hasEntriesThisMonth,
}: ScoreBreakdownProps) {
  return (
    <section className="card-surface edge-neon flex flex-col gap-4 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="cap cap-neon">Consistency this month</h2>
        <span className="font-mono text-fg-subtle text-xs tabular-nums">
          {loggedDays}/{elapsedTradingDays} days logged
        </span>
      </div>

      {hasEntriesThisMonth ? (
        <>
          <p className="text-glow font-mono text-[26px] font-bold leading-none tabular-nums">
            {score.score}
            <span className="ml-1.5 font-normal text-[13px] text-fg-subtle">
              of 100
            </span>
          </p>

          <ul className="flex flex-col gap-3">
            {partsOf(score).map((part) => (
              <li key={part.label} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="cap">{part.label}</span>
                  <span className="font-mono text-fg text-xs tabular-nums">
                    {Math.round(part.earned)}
                    <span className="text-fg-subtle"> / {part.possible}</span>
                  </span>
                </div>
                <ValueBar
                  ratio={part.possible === 0 ? 0 : part.earned / part.possible}
                  tone="process"
                  size="md"
                />
                <span className="text-[11.5px] text-fg-subtle">
                  {part.hint}
                </span>
              </li>
            ))}
          </ul>

          <p className="text-[11.5px] text-fg-subtle">
            Entries are averaged per day first, so twenty trades in one day
            count exactly as much as one. P&amp;L, win rate and R affect nothing
            here.
          </p>
        </>
      ) : (
        <p className="text-fg-muted text-sm">
          Log a trade — taken or missed — and this month&apos;s score starts
          building.
        </p>
      )}
    </section>
  );
}

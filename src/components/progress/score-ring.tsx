import { type ConsistencyScore, SCORE_WEIGHTS } from "@/domain/consistency";
import { type ScorePartKey, scoreRingArcs } from "@/lib/progress/ring";

/** 54 px of the 140 px box, leaving room for the 8 px stroke. */
const RADIUS = "38.57%";

const PART_LABEL: Record<ScorePartKey, string> = {
  showingUp: "Showing up",
  completeness: "Journaling",
  planAdherence: "Adherence",
  reviewHabit: "Review",
};

// One process colour, four strengths: the parts read as one figure, never as
// four competing accents. Classes, not presentation attributes (Design.md §2).
const PART_STROKE: Record<ScorePartKey, string> = {
  showingUp: "stroke-process",
  completeness: "stroke-process/75",
  planAdherence: "stroke-process/55",
  reviewHabit: "stroke-process/35",
};

const PART_DOT: Record<ScorePartKey, string> = {
  showingUp: "bg-process",
  completeness: "bg-process/75",
  planAdherence: "bg-process/55",
  reviewHabit: "bg-process/35",
};

/**
 * The consistency score as a ring of its four parts with a legend and the
 * logged trading days (Design.md §3.6). The arcs come rounded from
 * `scoreRingArcs`, so server and browser draw the same ring. No `viewBox`:
 * positions are percentages of the 140 px box (coding-standards.md, Charts).
 */
export function ScoreRing({
  score,
  loggedDays,
  elapsedTradingDays,
}: {
  score: ConsistencyScore;
  loggedDays: number;
  elapsedTradingDays: number;
}) {
  const arcs = scoreRingArcs(score);
  return (
    <section
      aria-label="Consistency this month"
      className="flex flex-col items-center gap-3"
    >
      <h2 className="self-start text-muted-foreground text-xs">
        Consistency this month
      </h2>
      <div className="relative flex h-[140px] w-[140px] items-center justify-center">
        <svg
          className="-rotate-90 absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <circle
            cx="50%"
            cy="50%"
            r={RADIUS}
            fill="none"
            strokeWidth="8"
            className="stroke-muted"
          />
          {arcs.map((arc) =>
            arc.length === 0 ? null : (
              <circle
                key={arc.key}
                cx="50%"
                cy="50%"
                r={RADIUS}
                fill="none"
                strokeWidth="8"
                pathLength={100}
                strokeDasharray={`${arc.length} 100`}
                strokeDashoffset={-arc.start}
                className={PART_STROKE[arc.key]}
              />
            ),
          )}
        </svg>
        <div className="flex flex-col items-center">
          <span className="font-mono font-semibold text-3xl text-process tabular-nums">
            {score.score}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            of 100
          </span>
        </div>
      </div>
      <dl className="grid w-full grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {arcs.map((arc) => (
          <div key={arc.key} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`h-2 w-2 shrink-0 rounded-full ${PART_DOT[arc.key]}`}
            />
            <dt className="text-muted-foreground">{PART_LABEL[arc.key]}</dt>
            <dd className="ml-auto font-mono tabular-nums">
              {score[arc.key].toFixed(1)}
              <span className="text-muted-foreground">
                /{SCORE_WEIGHTS[arc.key]}
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground text-xs">
        <span className="font-mono text-foreground tabular-nums">
          {loggedDays}
        </span>{" "}
        of{" "}
        <span className="font-mono text-foreground tabular-nums">
          {elapsedTradingDays}
        </span>{" "}
        trading days logged
      </p>
    </section>
  );
}

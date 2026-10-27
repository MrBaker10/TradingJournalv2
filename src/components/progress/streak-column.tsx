import { StreakOrb } from "@/components/dashboard/streak-orb";
import type { HeatmapCell } from "@/domain/progress";
import { DAY_CELL_CLASS, dayCellLabel, TODAY_RING } from "./day-cell";

const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F"];

/**
 * The streak as the dashboard's orb (Design.md §3.6), this week's trading
 * days under it and the longest streak. The week is the heatmap's last week,
 * so both always agree on what a logged day is.
 */
export function StreakColumn({
  current,
  longest,
  week,
  moment,
}: {
  current: number;
  longest: number;
  week: HeatmapCell[];
  /** Play the orb's gathering once. */
  moment: boolean;
}) {
  return (
    <section
      aria-label="Logging streak"
      className="flex flex-col items-center gap-3"
    >
      <h2 className="self-start text-muted-foreground text-xs">
        Logging streak
      </h2>
      <StreakOrb streak={current} longest={longest} moment={moment} />
      <ol aria-label="This week" className="flex gap-1.5">
        {week.map((cell, index) => (
          <li key={cell.date} className="flex flex-col items-center gap-1">
            <span
              role="img"
              aria-label={dayCellLabel(cell)}
              title={dayCellLabel(cell)}
              className={`h-7 w-7 rounded-md ${DAY_CELL_CLASS[cell.state]} ${
                cell.isToday ? TODAY_RING : ""
              }`}
            />
            <span
              aria-hidden="true"
              className="text-[10px] text-muted-foreground"
            >
              {WEEKDAY_LETTERS[index]}
            </span>
          </li>
        ))}
      </ol>
      <p className="text-muted-foreground text-xs">
        <span className="font-mono text-foreground tabular-nums">
          {current}
        </span>{" "}
        {current === 1 ? "day" : "days"} now · longest{" "}
        <span className="font-mono text-foreground tabular-nums">
          {longest}
        </span>
      </p>
    </section>
  );
}

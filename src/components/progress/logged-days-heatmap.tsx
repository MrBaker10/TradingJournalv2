"use client";

import { motion } from "motion/react";
import { useLocale } from "next-intl";
import { TermInfo } from "@/components/terms/term-info";
import { HEATMAP_WEEK_COUNT, type HeatmapCell } from "@/domain/progress";
import { useProcessMoment } from "@/hooks/use-process-moment";
import { DAY_CELL_CLASS, dayCellLabel, TODAY_RING } from "./day-cell";

function Cell({ cell, pulse }: { cell: HeatmapCell; pulse: boolean }) {
  const className = `relative aspect-square w-full max-w-5 rounded-[3px] ${DAY_CELL_CLASS[cell.state]} ${
    cell.isToday ? TODAY_RING : ""
  }`;
  const language = useLocale();
  const label = dayCellLabel(cell, language);
  if (!pulse) {
    return (
      <div role="img" aria-label={label} title={label} className={className} />
    );
  }
  // The newest logged day pulses once: a scale and a brief process light that
  // fades to nothing (Design.md §3.6, 900 ms).
  return (
    <motion.div
      role="img"
      aria-label={label}
      title={label}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.5, 1] }}
      transition={{ duration: 0.9, delay: 0.3 }}
      className={className}
    >
      <motion.span
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.8, 0] }}
        transition={{ duration: 0.9, delay: 0.3 }}
        className="absolute -inset-1 rounded-sm bg-process blur-sm"
      />
    </motion.div>
  );
}

/**
 * Logged trading days over 26 weeks, one column per week, Monday at the top
 * (Design.md §3.6): logged in the process colour, the grace day dashed, today
 * outlined. A missed setup counts the same as a trade. At a process moment
 * the newest logged day pulses once; nothing moves otherwise.
 */
export function LoggedDaysHeatmap({
  weeks,
  moment,
}: {
  weeks: HeatmapCell[][];
  moment: boolean;
}) {
  const play = useProcessMoment(moment);
  const newest = weeks.flat().findLast((cell) => cell.state === "logged")?.date;
  const pulseDate = play ? newest : undefined;

  return (
    <section aria-labelledby="heatmap-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="heatmap-heading" className="font-semibold text-sm">
          Logged trading days
        </h2>
        <span className="text-muted-foreground text-xs">
          Last {HEATMAP_WEEK_COUNT} weeks · a missed setup counts the same
        </span>
      </div>
      {/* 26 = HEATMAP_WEEK_COUNT; Tailwind only emits a class it can read. */}
      <div className="grid grid-cols-[repeat(26,minmax(0,1fr))] gap-[3px]">
        {weeks.map((week) => (
          <div key={week[0].date} className="grid gap-[3px]">
            {week.map((cell) => (
              <Cell
                key={cell.date}
                cell={cell}
                pulse={cell.date === pulseDate}
              />
            ))}
          </div>
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-[2px] bg-process/80"
          />
          Logged
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-[2px] border border-dashed border-process/60"
          />
          Grace day (one per month)
          <TermInfo term="graceDay" />
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-[2px] bg-muted"
          />
          Not logged
        </li>
      </ul>
    </section>
  );
}

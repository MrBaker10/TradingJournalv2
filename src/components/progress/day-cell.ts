import type { HeatmapCell, HeatmapState } from "@/domain/progress";
import type { Language } from "@/lib/i18n/languages";
import { formatDayLabel } from "@/lib/time";

// One look for a trading day wherever /progress draws one: the heatmap and the
// week strip under the orb (Design.md §3.6). Only the grace day is dashed.

export const DAY_CELL_CLASS: Record<HeatmapState, string> = {
  logged: "bg-process/80",
  grace: "border border-dashed border-process/60",
  open: "bg-muted",
  future: "border border-border",
};

export const TODAY_RING =
  "ring-1 ring-foreground/60 ring-offset-1 ring-offset-background";

const STATE_LABEL: Record<HeatmapState, string> = {
  logged: "logged",
  grace: "grace day",
  open: "not logged",
  future: "still to come",
};

/** What a cell says to a screen reader and on hover (Design.md §5). */
export function dayCellLabel(cell: HeatmapCell, language: Language): string {
  return `${formatDayLabel(cell.date, language)}, ${STATE_LABEL[cell.state]}${
    cell.isToday ? ", today" : ""
  }`;
}

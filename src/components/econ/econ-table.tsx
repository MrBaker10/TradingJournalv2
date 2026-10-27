"use client";

import { ChevronRight, Folder } from "lucide-react";
import { moveRowFocus } from "@/components/ui/row-focus";
import type { EconEventRow } from "@/db/queries/econ";
import { type EconDay, isHighImpact, isPast } from "@/domain/econ";
import { formatEventDayLabel, formatEventTime } from "@/lib/time";

/**
 * The stored events as the dense table of Design.md §3.4, one row per event
 * under a row for each day in the user's zone. Header and figure cells do
 * not wrap; the event cell may. A past event is dimmed and struck through.
 * The title is a button stretched over its row, so the whole row opens the
 * sheet and the keyboard reaches it.
 */
export function EconTable({
  days,
  timeZone,
  now,
  openId,
  onOpen,
}: {
  days: EconDay<EconEventRow>[];
  /** `users.timezone` — the zone every time on this page is read in. */
  timeZone: string;
  /**
   * The request's clock, read once per render: a row that passes while the
   * page is open gets its line on the next reload or filter click.
   */
  now: Date;
  openId: number | null;
  onOpen: (eventId: number) => void;
}) {
  // `relative` makes the scroll box the containing block of the stretched
  // buttons, or they would widen the page at 390 px.
  return (
    <div className="relative overflow-x-auto rounded-xl border">
      <table
        className="w-full text-sm [&_th]:whitespace-nowrap [&>tbody:last-child>tr:last-child]:border-b-0"
        onKeyDown={moveRowFocus}
      >
        <thead>
          <tr className="border-b bg-muted/30 text-left text-muted-foreground text-xs">
            <th className="px-4 py-2 font-normal">Time</th>
            <th className="px-4 py-2 font-normal">Cur</th>
            <th className="px-4 py-2 font-normal">Impact</th>
            <th className="px-4 py-2 font-normal">Event</th>
            <th className="px-4 py-2 text-right font-normal">Forecast</th>
            <th className="px-4 py-2 text-right font-normal">Previous</th>
            <th className="w-8">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        {days.map((day) => (
          <tbody key={day.date}>
            <tr className="border-b bg-muted/30">
              <th
                scope="rowgroup"
                colSpan={7}
                className="px-4 py-1.5 text-left font-medium text-muted-foreground text-xs"
              >
                {formatEventDayLabel(day.date)}
              </th>
            </tr>
            {day.events.map((event) => {
              const past = isPast(event.occursAt, now);
              return (
                <tr
                  key={event.id}
                  aria-current={event.id === openId ? "true" : undefined}
                  className={`group relative border-b align-top transition-colors duration-150 hover:bg-accent has-focus-visible:bg-accent has-focus-visible:ring-3 has-focus-visible:ring-ring/50 aria-current:bg-muted ${past ? "text-muted-foreground" : ""}`}
                >
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono tabular-nums">
                    {formatEventTime(event.occursAt, timeZone)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono">
                    {event.currency}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    <ImpactTag impact={event.impact} />
                  </td>
                  <td className="min-w-56 px-4 py-2.5">
                    <button
                      type="button"
                      data-row
                      onClick={() => onOpen(event.id)}
                      className={`text-left outline-none after:absolute after:inset-0 ${past ? "line-through" : ""}`}
                    >
                      {past && <span className="sr-only">Past: </span>}
                      {event.title}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono tabular-nums">
                    <Figure value={event.forecast} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono tabular-nums">
                    <Figure value={event.previous} />
                  </td>
                  <td className="py-2.5 pr-3">
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4 text-muted-foreground transition-[translate] duration-150 group-hover:translate-x-0.5"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}

const FOLDER_TONE: Record<string, string> = {
  High: "text-impact-high",
  Medium: "text-impact-medium",
  Low: "text-impact-low",
};

/**
 * Impact as a filled folder in its own tokens — the red is not the loss red,
 * the orange not the practice amber — and never on its own: the word stands
 * beside it.
 */
export function ImpactTag({ impact }: { impact: string }) {
  const folder = FOLDER_TONE[impact] ?? "text-muted-foreground";
  return (
    <span className="inline-flex items-center gap-1.5">
      <Folder
        className={`size-3.5 shrink-0 fill-current ${folder}`}
        aria-hidden="true"
      />
      <span
        className={
          isHighImpact(impact) ? "font-medium" : "text-muted-foreground"
        }
      >
        {impact}
      </span>
    </span>
  );
}

/** A forecast or previous figure as the feed wrote it; none is a dash. */
export function Figure({ value }: { value: string | null }) {
  return value ?? <span className="text-muted-foreground">—</span>;
}

import { Folder } from "lucide-react";
import type { EconEventRow } from "@/db/queries/econ";
import { type EconDay, isHighImpact, isPast } from "@/domain/econ";
import { formatEventDayLabel, formatEventTime } from "@/lib/time";

interface EconEventListProps {
  days: EconDay<EconEventRow>[];
  /** `users.timezone` — the zone every time on this page is read in. */
  timeZone: string;
  /**
   * The request's clock. A row at or before it is struck through; it is read
   * once per render, so a row that passes while the page is open gets its line
   * on the next reload or filter click.
   */
  now: Date;
}

// Design.md §4.23: one card per day in the user's zone, the row layout of the
// analytics tables (§4.16). Impact sits right before the event it rates, as a
// filled folder in its own tokens — the red is not the loss red, the orange
// not the practice amber — and never on its own: the word stands beside it
// (§8). No glow.
export function EconEventList({ days, timeZone, now }: EconEventListProps) {
  return (
    <div className="flex flex-col gap-[10px]">
      {days.map((day) => (
        <section
          key={day.date}
          aria-label={formatEventDayLabel(day.date)}
          className="card-surface edge flex flex-col gap-2 p-4"
        >
          <h2 className="cap">{formatEventDayLabel(day.date)}</h2>

          <div className="flex items-baseline justify-between gap-3 border-white/8 border-b pb-1.5">
            <span className="flex min-w-0 gap-3">
              <span className="cap w-11">Time</span>
              <span className="cap w-9">Cur</span>
              <span className="cap w-20">Impact</span>
              <span className="cap">Event</span>
            </span>
            <span className="flex shrink-0 gap-3">
              <span className="cap w-16 text-right">Forecast</span>
              <span className="cap w-16 text-right">Previous</span>
            </span>
          </div>

          <ul className="flex flex-col divide-y divide-white/6">
            {day.events.map((event) => {
              const past = isPast(event.occursAt, now);
              return (
                <li
                  key={event.id}
                  className={`relative flex items-baseline justify-between gap-3 py-2 ${
                    past
                      ? "opacity-50 after:pointer-events-none after:absolute after:inset-x-0 after:top-1/2 after:h-px after:bg-fg-muted"
                      : ""
                  }`}
                >
                  <span className="flex min-w-0 items-baseline gap-3">
                    <span className="w-11 shrink-0 font-mono text-[13px] text-fg-muted tabular-nums">
                      {formatEventTime(event.occursAt, timeZone)}
                    </span>
                    <span className="w-9 shrink-0 font-mono text-[13px] text-fg">
                      {event.currency}
                    </span>
                    <ImpactTag impact={event.impact} />
                    <span
                      className="truncate text-fg text-sm"
                      title={event.title}
                    >
                      {past ? <span className="sr-only">Past: </span> : null}
                      {event.title}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-baseline gap-3">
                    <Value value={event.forecast} />
                    <Value value={event.previous} />
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

const FOLDER_TONE: Record<string, string> = {
  High: "text-impact-high",
  Medium: "text-impact-medium",
  Low: "text-impact-low",
};

function ImpactTag({ impact }: { impact: string }) {
  const word = isHighImpact(impact)
    ? "font-semibold text-fg"
    : impact === "Medium"
      ? "text-fg-muted"
      : "text-fg-subtle";
  const folder = FOLDER_TONE[impact] ?? "text-fg-subtle";
  return (
    <span className="flex w-20 shrink-0 items-center gap-1.5 self-center">
      <Folder
        className={`h-3.5 w-3.5 shrink-0 fill-current ${folder}`}
        aria-hidden="true"
      />
      <span className={`text-xs ${word}`}>{impact}</span>
    </span>
  );
}

function Value({ value }: { value: string | null }) {
  return (
    <span className="w-16 text-right font-mono text-[13px] text-fg-muted tabular-nums">
      {value ?? <span className="text-fg-subtle">—</span>}
    </span>
  );
}

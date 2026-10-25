"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { setChecklistStepChecked } from "@/actions/checklist";
import { InlineMessage } from "@/components/ui/inline-message";
import type { DailyChecklistItem } from "@/db/queries/checklist";
import {
  CHECKLIST_PHASE_LABELS,
  CHECKLIST_PHASES,
  CHECKLIST_TICK_FAILED,
} from "@/schemas/checklist";

type Tick = { id: number; checked: boolean };

// Today's copy of the checklist template. A process card like the plan card
// (Design.md §4.6), so it carries the neon edge and a completed phase count
// glows — but a finished phase gets no toast, animation or celebration, and
// ticking feeds no streak, score or badge.
export function DailyChecklistCard({ items }: { items: DailyChecklistItem[] }) {
  const [optimisticItems, applyTick] = useOptimistic(
    items,
    (state, tick: Tick) =>
      state.map((item) =>
        item.id === tick.id ? { ...item, checked: tick.checked } : item,
      ),
  );
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Optimistic: the tick shows at once and falls back to the server-rendered
  // state when the transition ends, so a failed save rolls back by itself.
  function toggle(tick: Tick) {
    setError(null);
    startTransition(async () => {
      applyTick(tick);
      try {
        const result = await setChecklistStepChecked({
          itemId: tick.id,
          checked: tick.checked,
        });
        if (!result.success) setError(result.error);
      } catch {
        setError(CHECKLIST_TICK_FAILED);
      }
    });
  }

  return (
    <section
      aria-labelledby="daily-checklist-heading"
      className="card-surface edge-neon flex flex-col gap-3 p-5"
    >
      <h2 id="daily-checklist-heading" className="cap cap-neon">
        Daily checklist
      </h2>
      {items.length === 0 ? (
        <p className="text-fg-muted text-sm">
          No routine steps yet.{" "}
          <Link
            href="/settings"
            className="text-cyan underline-offset-2 hover:underline"
          >
            Set up your checklist in Settings
          </Link>
          .
        </p>
      ) : (
        <>
          {CHECKLIST_PHASES.map((phase) => {
            const steps = optimisticItems.filter(
              (item) => item.phase === phase,
            );
            const done = steps.filter((item) => item.checked).length;
            const complete = steps.length > 0 && done === steps.length;
            return (
              <section
                key={phase}
                aria-labelledby={`daily-checklist-${phase}`}
                className="flex flex-col gap-1"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3
                    id={`daily-checklist-${phase}`}
                    className="font-medium text-fg text-sm"
                  >
                    {CHECKLIST_PHASE_LABELS[phase]}
                  </h3>
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      complete ? "text-glow" : "text-fg-muted"
                    }`}
                  >
                    <span aria-hidden="true">
                      {done}/{steps.length}
                    </span>
                    <span className="sr-only">
                      {done} of {steps.length} done
                    </span>
                  </span>
                </div>
                {steps.length === 0 ? (
                  <p className="py-2 text-fg-subtle text-sm">
                    No steps in this phase.
                  </p>
                ) : (
                  <ul>
                    {steps.map((item) => (
                      <li key={item.id}>
                        <label className="flex min-h-10 cursor-pointer items-center gap-3 py-1 text-fg text-sm">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={(event) =>
                              toggle({
                                id: item.id,
                                checked: event.target.checked,
                              })
                            }
                            className="h-4 w-4 shrink-0 accent-cyan focus-visible:outline-2 focus-visible:outline-cyan focus-visible:outline-offset-2"
                          />
                          <span className="min-w-0 break-words">
                            {item.text}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
          <InlineMessage message={error} />
        </>
      )}
    </section>
  );
}

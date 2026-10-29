"use client";

import { Check } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { setChecklistStepChecked } from "@/actions/checklist";
import { InlineMessage } from "@/components/ui/inline-message";
import type { DailyChecklistItem } from "@/db/queries/checklist";
import { Link } from "@/lib/i18n/navigation";
import {
  CHECKLIST_PHASE_LABELS,
  CHECKLIST_PHASES,
  CHECKLIST_TICK_FAILED,
} from "@/schemas/checklist";
import { PenStrike } from "./pen-strike";

type Tick = { id: number; checked: boolean };

// Today's copy of the checklist template (Design.md §3.2). Ticking a step
// strikes it through like a pen; a finished phase gets no toast, animation or
// celebration, and ticking feeds no streak, score or badge.
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
      className="flex flex-col gap-3"
    >
      <h2
        id="daily-checklist-heading"
        className="text-[11px] text-muted-foreground uppercase tracking-wider"
      >
        Daily checklist
      </h2>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No routine steps yet.{" "}
          <Link
            href="/settings"
            className="text-foreground underline underline-offset-2"
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
            return (
              <section
                key={phase}
                aria-labelledby={`daily-checklist-${phase}`}
                className="flex flex-col"
              >
                <div className="mb-1 flex items-baseline justify-between gap-3 text-muted-foreground text-xs">
                  <h3 id={`daily-checklist-${phase}`}>
                    {CHECKLIST_PHASE_LABELS[phase]}
                  </h3>
                  <span className="font-mono tabular-nums">
                    <span aria-hidden="true">
                      {done}/{steps.length}
                    </span>
                    <span className="sr-only">
                      {done} of {steps.length} done
                    </span>
                  </span>
                </div>
                {steps.length === 0 ? (
                  <p className="py-1 text-muted-foreground text-sm">
                    No steps in this phase.
                  </p>
                ) : (
                  <ul>
                    {steps.map((item) => (
                      <li key={item.id}>
                        <label className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1 text-sm transition-colors duration-150 hover:bg-accent/60 has-focus-visible:ring-3 has-focus-visible:ring-ring/50 lg:min-h-8">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={(event) =>
                              toggle({
                                id: item.id,
                                checked: event.target.checked,
                              })
                            }
                            className="peer sr-only"
                          />
                          <span
                            aria-hidden="true"
                            className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input text-background transition-colors duration-150 peer-checked:border-foreground peer-checked:bg-foreground [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
                          >
                            <Check className="size-3" strokeWidth={3} />
                          </span>
                          <PenStrike text={item.text} on={item.checked} />
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

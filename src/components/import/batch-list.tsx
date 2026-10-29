"use client";

import { useState, useTransition } from "react";
import { undoImportBatch } from "@/actions/import";
import { Button } from "@/components/ui/button";
import { PendingIndicator } from "@/components/ui/pending-indicator";
import { notifyProcess } from "@/components/ui/toast";
import type { ImportBatchSummary } from "@/db/queries/import";
import { useRouter } from "@/lib/i18n/navigation";
import { calendarDateOf, formatDayLabel } from "@/lib/time";
import { StepError } from "./step-error";

interface BatchListProps {
  batches: ImportBatchSummary[];
  /** The trader's zone. `created_at` is an instant and needs one to be a date. */
  timeZone: string;
}

/**
 * Past imports, each with an undo.
 *
 * This is the first path in the project that deletes trades, so it says
 * exactly how many it will take before it takes them — "Remove 41 of 42" —
 * and asks once more in place. A trade that has been worked on since the
 * import is never in that number: anything with a note, a setup, a grade, a
 * screenshot or a tag stays, and hand-logged trades were never part of a
 * batch to begin with.
 *
 * The confirmation is a second click on the button itself rather than
 * `window.confirm`, which would block every further browser event.
 */
export function BatchList({ batches, timeZone }: BatchListProps) {
  const router = useRouter();
  const [armed, setArmed] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function remove(batchId: number) {
    if (armed !== batchId) {
      setArmed(batchId);
      setError(null);
      return;
    }

    startTransition(async () => {
      const response = await undoImportBatch({ batchId });
      setArmed(null);
      if (!response.success) {
        setError(response.error);
        return;
      }
      // Confirms the action, never the outcome (Design.md §3.11).
      const { removed } = response.data;
      notifyProcess(`Removed ${removed} ${removed === 1 ? "trade" : "trades"}`);
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-3 border-t pt-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-medium text-sm">Past imports</h2>
        <p className="text-muted-foreground text-xs">
          Undo removes only the trades you have not worked on since.
        </p>
      </div>

      {batches.length === 0 ? (
        <p className="py-4 text-center text-muted-foreground text-sm">
          Nothing imported yet.
        </p>
      ) : (
        <ul className="flex flex-col rounded-xl border">
          {batches.map((batch) => (
            <li
              key={batch.id}
              className="flex items-center justify-between gap-3 border-b px-4 py-2.5 last:border-b-0"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm">{batch.filename}</span>
                <span className="text-muted-foreground text-xs">
                  {batch.accountName} ·{" "}
                  <span className="font-mono tabular-nums">
                    {formatDayLabel(calendarDateOf(batch.createdAt, timeZone))}
                  </span>{" "}
                  · {batch.detectedShape}
                </span>
              </span>
              <Button
                type="button"
                size="lg"
                variant={armed === batch.id ? "destructive" : "outline"}
                className="h-10 shrink-0 px-3 lg:h-9"
                disabled={isPending || batch.removable === 0}
                onClick={() => remove(batch.id)}
              >
                {isPending && armed === batch.id ? (
                  <PendingIndicator label="Removing…" />
                ) : armed === batch.id ? (
                  "Click again to remove"
                ) : (
                  <span className="font-mono tabular-nums">
                    Remove {batch.removable} of {batch.total}
                  </span>
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <StepError message={error} />
    </section>
  );
}

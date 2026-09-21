"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { undoImportBatch } from "@/actions/import";
import { InlineMessage } from "@/components/ui/inline-message";
import { PendingIndicator } from "@/components/ui/pending-indicator";
import type { ImportBatchSummary } from "@/db/queries/import";
import { calendarDateOf, formatDayLabel } from "@/lib/time";

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
      router.refresh();
    });
  }

  return (
    <section className="card-surface edge flex flex-col gap-3 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="cap">Past imports</h2>
        <p className="text-[11.5px] text-fg-subtle">
          Undo removes only the trades you have not worked on since.
        </p>
      </div>

      {batches.length === 0 ? (
        <p className="py-4 text-center text-fg-subtle text-sm">
          Nothing imported yet.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/6">
          {batches.map((batch) => (
            <li
              key={batch.id}
              className="flex items-baseline justify-between gap-3 py-2"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-fg text-sm">
                  {batch.filename}
                </span>
                <span className="text-[11.5px] text-fg-subtle">
                  {batch.accountName} ·{" "}
                  {formatDayLabel(calendarDateOf(batch.createdAt, timeZone))} ·{" "}
                  {batch.detectedShape}
                </span>
              </span>
              <button
                type="button"
                disabled={isPending || batch.removable === 0}
                onClick={() => remove(batch.id)}
                className={`shrink-0 rounded-ctl border px-3 py-1.5 text-sm transition-colors duration-150 disabled:opacity-40 ${
                  armed === batch.id
                    ? "border-danger-fg/60 text-danger-fg"
                    : "border-white/12 text-fg-muted hover:border-danger-fg/45"
                }`}
              >
                {isPending && armed === batch.id ? (
                  <PendingIndicator label="Removing…" />
                ) : armed === batch.id ? (
                  "Click again to remove"
                ) : (
                  `Remove ${batch.removable} of ${batch.total}`
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <InlineMessage message={error} />
    </section>
  );
}

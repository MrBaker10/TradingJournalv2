"use client";

import Link from "next/link";
import type { ImportResult } from "@/actions/import";
import { DrawnCheck } from "@/components/trades/form-blocks";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ResultStepProps {
  result: ImportResult;
  onAnother: () => void;
}

/**
 * Step four: what actually happened, confirmed as the action — "Imported 12
 * trades" — with the trade form's drawn check and no P&L (Design.md §3.11).
 *
 * The counters come from the transaction, not from the preview — the journal
 * may have changed between the two, and the number that gets reported has to
 * be the one that was written. Written means new and updated, as the confirm
 * button counted them.
 */
export function ResultStep({ result, onAnother }: ResultStepProps) {
  const written = result.new + result.update;
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-12 text-center">
      <DrawnCheck />
      {/* Only the confirmation is announced, not the buttons below it. */}
      <div role="status">
        <h2 className="font-semibold text-xl tracking-tight">
          Imported {written} {written === 1 ? "trade" : "trades"}
        </h2>
      </div>
      <p className="font-mono text-muted-foreground text-sm tabular-nums">
        {result.new} new · {result.update} updated · {result.skip} skipped
      </p>
      <p className="text-muted-foreground text-xs">
        Skipped rows were already in your journal.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button size="lg" className="h-10 px-4" onClick={onAnother}>
          Import another file
        </Button>
        <Link
          href="/journal"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "h-10 px-4",
          )}
        >
          View in journal
        </Link>
      </div>
    </div>
  );
}

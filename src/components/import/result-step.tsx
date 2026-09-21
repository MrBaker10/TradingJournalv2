"use client";

import Link from "next/link";
import type { ImportResult } from "@/actions/import";

interface ResultStepProps {
  result: ImportResult;
  onAnother: () => void;
}

/**
 * Step four: what actually happened.
 *
 * The counters come from the transaction, not from the preview — the journal
 * may have changed between the two, and the number that gets reported has to
 * be the one that was written.
 *
 * No celebration and no colour on the numbers: an import is bookkeeping, and
 * Design.md keeps the green for a day that was actually traded well.
 */
export function ResultStep({ result, onAnother }: ResultStepProps) {
  return (
    <section className="card-surface edge flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="cap cap-neon">Done</h2>
        <p className="text-fg text-sm">
          Imported {result.new} · updated {result.update} · {result.skip}{" "}
          already in your journal were skipped.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/journal"
          className="flex h-10 items-center rounded-ctl bg-[image:var(--gradient-info)] px-4 font-medium text-fg text-sm shadow-[var(--shadow-button-primary)]"
        >
          Open the journal
        </Link>
        <button
          type="button"
          onClick={onAnother}
          className="rounded-ctl border border-white/12 px-4 py-2 text-fg-muted text-sm transition-colors duration-150 hover:border-cyan/35"
        >
          Import another file
        </button>
      </div>
    </section>
  );
}

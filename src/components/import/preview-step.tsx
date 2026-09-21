"use client";

import type { ImportPreview, RowVerdict } from "@/actions/import";
import { InlineMessage } from "@/components/ui/inline-message";
import { PendingIndicator } from "@/components/ui/pending-indicator";
import type { InstrumentRef } from "@/domain/import/normalize";
import type { ParsedFile } from "./import-wizard";

interface PreviewStepProps {
  parsed: ParsedFile;
  preview: ImportPreview;
  instruments: InstrumentRef[];
  accountName: string;
  isPractice: boolean;
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onConfirm: () => void;
}

// Process outcomes, not money. Design.md §1 keeps the neon for these and
// leaves the semantic green and red to figures that were actually earned.
const VERDICT_CLASS: Record<RowVerdict, string> = {
  new: "text-cyan",
  update: "text-fg",
  skip: "text-fg-subtle",
};

/**
 * Step three: what an import would do, before it does it.
 *
 * Nothing here is written. The counters and the per-row reasons come from
 * `previewImport`, which matches against the journal without touching it.
 */
export function PreviewStep({
  parsed,
  preview,
  instruments,
  accountName,
  isPractice,
  pending,
  error,
  onBack,
  onConfirm,
}: PreviewStepProps) {
  const symbolById = new Map(
    instruments.map((instrument) => [instrument.id, instrument.symbol]),
  );
  const rowBySource = new Map(parsed.rows.map((row) => [row.sourceRow, row]));

  // The fourth counter never reaches the server: an unreadable row is dropped
  // in the browser and has nothing to be matched against.
  const counters = [
    { label: "New", value: preview.counters.new },
    { label: "Update", value: preview.counters.update },
    { label: "Skip", value: preview.counters.skip },
    { label: "Invalid", value: parsed.invalid.length },
  ];

  return (
    <div className="flex flex-col gap-4">
      <section className="card-surface edge flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-1">
          <h2 className="cap cap-neon">Preview</h2>
          <p className="text-[11.5px] text-fg-subtle">
            {parsed.filename} into {accountName}
            {isPractice ? " — a practice account" : ""}. Nothing has been
            written yet.
          </p>
        </div>

        <div className="flex flex-wrap gap-6">
          {counters.map((counter) => (
            <div key={counter.label} className="flex flex-col gap-0.5">
              <span className="cap">{counter.label}</span>
              <span className="font-mono text-[19px] text-fg tabular-nums">
                {counter.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card-surface edge flex flex-col gap-3 p-5">
        <div className="flex items-baseline justify-between gap-3 border-white/8 border-b pb-1.5">
          <span className="cap">Row</span>
          <span className="flex shrink-0 gap-3">
            <span className="cap w-20 text-right">Date</span>
            <span className="cap w-16 text-right">Entry</span>
            <span className="cap w-20 text-right">File P&amp;L</span>
            <span className="cap w-16 text-right">Verdict</span>
          </span>
        </div>

        <ul className="flex flex-col divide-y divide-white/6">
          {preview.rows.map((row) => {
            const trade = rowBySource.get(row.sourceRow);
            return (
              <li key={row.sourceRow} className="flex flex-col gap-1.5 py-2">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-fg text-sm">
                    {symbolById.get(trade?.instrumentId ?? -1) ?? "—"}{" "}
                    <span className="text-fg-muted">
                      {trade?.direction} {trade?.contracts}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-baseline gap-3 font-mono text-[13px] tabular-nums">
                    <span className="w-20 text-right text-fg-muted">
                      {trade?.tradeDate ?? "—"}
                    </span>
                    <span className="w-16 text-right text-fg-muted">
                      {trade?.entryTime.slice(0, 5) ?? "—"}
                    </span>
                    {/* Never coloured: the file's own P&L is shown for
                        comparison and is never written. Design.md §4.17 does
                        not let an unrealised number look like an earned one. */}
                    <span className="w-20 text-right text-fg-subtle">
                      {row.filePnl ?? "—"}
                    </span>
                    <span
                      className={`w-16 text-right ${VERDICT_CLASS[row.verdict]}`}
                    >
                      {row.verdict}
                    </span>
                  </span>
                </div>
                <span className="text-[11.5px] text-fg-subtle">
                  line {row.sourceRow} — {row.reason}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {parsed.invalid.length > 0 ? (
        <section className="card-surface edge flex flex-col gap-3 p-5">
          <div className="flex flex-col gap-1">
            <h2 className="cap">Rows that could not be read</h2>
            <p className="text-[11.5px] text-fg-subtle">
              These are skipped. They do not stop the rest of the file.
            </p>
          </div>
          <ul className="flex flex-col divide-y divide-white/6">
            {parsed.invalid.map((row) => (
              <li
                key={`${row.sourceRow}-${row.reason}`}
                className="flex items-baseline justify-between gap-3 py-2"
              >
                <span className="truncate text-danger-fg text-sm">
                  {row.reason}
                </span>
                <span className="shrink-0 font-mono text-[13px] text-fg-subtle tabular-nums">
                  line {row.sourceRow}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={pending}
            className="rounded-ctl border border-white/12 px-4 py-2 text-fg-muted text-sm transition-colors duration-150 hover:border-cyan/35 disabled:opacity-60"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="flex h-10 items-center gap-2 rounded-ctl bg-[image:var(--gradient-info)] px-4 font-medium text-fg text-sm shadow-[var(--shadow-button-primary)] disabled:opacity-60"
          >
            {pending ? <PendingIndicator label="Importing…" /> : null}
            Import {preview.counters.new + preview.counters.update} trades
          </button>
        </div>
        <InlineMessage message={error} />
      </div>
    </div>
  );
}

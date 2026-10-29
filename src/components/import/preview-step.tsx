"use client";

import { useLocale } from "next-intl";
import type { ImportPreview, RowVerdict } from "@/actions/import";
import { Button } from "@/components/ui/button";
import { PendingIndicator } from "@/components/ui/pending-indicator";
import type { InstrumentRef } from "@/domain/import/normalize";
import type { Language } from "@/lib/i18n/languages";
import { formatCentsPlain } from "@/lib/money";
import { formatDecimalString } from "@/lib/numbers";
import { formatNumericDate } from "@/lib/time";
import type { ParsedFile } from "./import-wizard";
import { StepError } from "./step-error";

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

// Process outcomes, not money: a new row is marked in `process`, and the
// semantic green and red stay with figures that were actually earned.
const VERDICT_CLASS: Record<RowVerdict, string> = {
  new: "text-process",
  update: "text-foreground",
  skip: "text-muted-foreground",
};

/** An amount with its currency, plain: the preview compares, it does not rate. */
function amount(
  cents: number | null,
  currency: string,
  language: Language,
): string {
  return cents === null
    ? "—"
    : `${formatDecimalString(formatCentsPlain(cents), language)} ${currency}`;
}

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
  const language = useLocale();
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
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold text-lg">Preview</h2>
          <p className="text-muted-foreground text-xs">
            {parsed.filename} into {accountName}
            {isPractice ? " — a practice account" : ""}. Nothing has been
            written yet.
          </p>
        </div>

        <dl className="flex flex-wrap gap-x-8 gap-y-2">
          {counters.map((counter) => (
            <div key={counter.label} className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground text-xs">{counter.label}</dt>
              <dd className="font-mono text-lg tabular-nums">
                {counter.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* The dense table of Design.md §3.4, without a detail: every row's
          reason sits under its trade. Below `lg` it scrolls in its box. */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm [&_th]:whitespace-nowrap">
          <thead>
            <tr className="border-b bg-muted/30 text-left text-muted-foreground text-xs">
              <th className="px-4 py-2 font-normal">Trade</th>
              <th className="px-4 py-2 font-normal">Date</th>
              <th className="px-4 py-2 text-right font-normal">Entry</th>
              <th className="px-4 py-2 text-right font-normal">File P&amp;L</th>
              <th className="px-4 py-2 text-right font-normal">From prices</th>
              <th className="px-4 py-2 text-right font-normal">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row) => {
              const trade = rowBySource.get(row.sourceRow);
              return (
                <tr
                  key={row.sourceRow}
                  className="border-b align-top transition-colors duration-150 last:border-b-0 hover:bg-accent"
                >
                  <td className="min-w-64 px-4 py-2.5">
                    <span className="font-mono">
                      {symbolById.get(trade?.instrumentId ?? -1) ?? "—"}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {trade?.direction}{" "}
                      <span className="font-mono tabular-nums">
                        {trade
                          ? formatDecimalString(trade.contracts, language)
                          : null}
                      </span>
                    </span>
                    <p className="text-muted-foreground text-xs">
                      line {row.sourceRow} — {row.reason}
                      {row.pnlUsdCents !== null && row.fxRateDate !== null
                        ? ` · stored as ${amount(row.pnlUsdCents, "USD", language)} at the ECB rate of ${formatNumericDate(row.fxRateDate, language)}`
                        : ""}
                      {row.provisional
                        ? " · provisional rate, corrected overnight"
                        : ""}
                      {trade?.stopPrice != null
                        ? ` · stop ${formatDecimalString(trade.stopPrice, language)}`
                        : ""}
                      {trade?.stopNotice ? ` · ${trade.stopNotice}` : ""}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-muted-foreground tabular-nums">
                    {trade ? formatNumericDate(trade.tradeDate, language) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-muted-foreground tabular-nums">
                    {trade?.entryTime.slice(0, 5) ?? "—"}
                  </td>
                  {/* Never coloured: nothing here is written yet, and an
                      unrealised number must not look like an earned one. The
                      file's amount is in the account's currency, the
                      price-derived one in USD. */}
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono tabular-nums">
                    {amount(row.filePnlCents, preview.currency, language)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono tabular-nums">
                    {amount(row.computedPnlCents, "USD", language)}
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-2.5 text-right ${VERDICT_CLASS[row.verdict]}`}
                  >
                    {row.verdict}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {parsed.invalid.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <h3 className="font-medium text-sm">Rows that could not be read</h3>
            <p className="text-muted-foreground text-xs">
              These are skipped. They do not stop the rest of the file.
            </p>
          </div>
          <ul className="flex flex-col rounded-xl border">
            {parsed.invalid.map((row) => (
              <li
                key={`${row.sourceRow}-${row.reason}`}
                className="flex items-baseline justify-between gap-3 border-b px-4 py-2 last:border-b-0"
              >
                <span className="min-w-0 text-negative text-sm">
                  {row.reason}
                </span>
                <span className="shrink-0 font-mono text-muted-foreground text-xs tabular-nums">
                  line {row.sourceRow}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="lg"
            className="h-10 min-w-36 px-4"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? (
              <PendingIndicator label="Importing…" />
            ) : (
              `Import ${preview.counters.new + preview.counters.update} trades`
            )}
          </Button>
          <Button
            type="button"
            size="lg"
            variant="ghost"
            className="h-10 px-4"
            onClick={onBack}
            disabled={pending}
          >
            Back
          </Button>
        </div>
        <StepError message={error} />
      </div>
    </div>
  );
}

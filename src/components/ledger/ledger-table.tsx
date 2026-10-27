"use client";

import { ChevronRight } from "lucide-react";
import { moveRowFocus } from "@/components/ui/row-focus";
import type { LedgerEntryRow } from "@/db/queries/ledger";
import { signedLedgerCents } from "@/domain/ledger";
import { moneyTone } from "@/lib/dashboard/sign-tone";
import { formatCents } from "@/lib/money";
import { formatDateWithYear } from "@/lib/time";
import { ledgerEntryLabel } from "./ledger-labels";

/**
 * Ledger entries as the dense table of Design.md §3.4: a row per entry, mono
 * figures right-aligned in sign colour. Header and figure cells do not wrap;
 * the entry cell may. The entry's label is a button stretched over its row,
 * so the whole row opens the sheet and the keyboard reaches it.
 */
export function LedgerTable({
  entries,
  openId,
  onOpen,
}: {
  entries: LedgerEntryRow[];
  openId: number | null;
  onOpen: (entryId: number) => void;
}) {
  // `relative` makes the scroll box the containing block of the stretched
  // buttons, or they would widen the page at 390 px.
  return (
    <div className="relative overflow-x-auto rounded-xl border">
      <table className="w-full text-sm [&_th]:whitespace-nowrap">
        <thead>
          <tr className="border-b bg-muted/30 text-left text-muted-foreground text-xs">
            <th className="px-4 py-2 font-normal">Date</th>
            <th className="px-4 py-2 font-normal">Entry</th>
            <th className="px-4 py-2 font-normal">Account</th>
            <th className="px-4 py-2 text-right font-normal">Amount</th>
            <th className="w-8">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody onKeyDown={moveRowFocus}>
          {entries.map((entry) => {
            const signed = signedLedgerCents(entry);
            return (
              <tr
                key={entry.id}
                aria-current={entry.id === openId ? "true" : undefined}
                className="group relative border-b align-top transition-colors duration-150 last:border-b-0 hover:bg-accent has-focus-visible:bg-accent has-focus-visible:ring-3 has-focus-visible:ring-ring/50 aria-current:bg-muted"
              >
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-muted-foreground tabular-nums">
                  {formatDateWithYear(entry.entryDate)}
                </td>
                <td className="min-w-48 px-4 py-2.5">
                  <button
                    type="button"
                    data-row
                    onClick={() => onOpen(entry.id)}
                    className="text-left outline-none after:absolute after:inset-0"
                  >
                    {ledgerEntryLabel(entry.kind, entry.category)}
                  </button>
                  {entry.note && (
                    <p className="line-clamp-2 text-muted-foreground text-xs">
                      {entry.note}
                    </p>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  {entry.accountName ?? (
                    <span className="text-muted-foreground">No account</span>
                  )}
                </td>
                <td
                  className={`whitespace-nowrap px-4 py-2.5 text-right font-mono tabular-nums ${moneyTone(signed)}`}
                >
                  {formatCents(signed, { signed: true })}
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
      </table>
    </div>
  );
}

"use client";

import {
  ChevronCell,
  OpenColumnHead,
  ROW_OPENER,
  TABLE_BOX,
  TABLE_HEAD_CELL,
  TABLE_HEAD_ROW,
  TABLE_ROW,
} from "@/components/ui/dense-table";
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
  return (
    <div className={TABLE_BOX}>
      <table className="w-full text-sm [&_th]:whitespace-nowrap">
        <thead>
          <tr className={TABLE_HEAD_ROW}>
            <th className={TABLE_HEAD_CELL}>Date</th>
            <th className={TABLE_HEAD_CELL}>Entry</th>
            <th className={TABLE_HEAD_CELL}>Account</th>
            <th className={`${TABLE_HEAD_CELL} text-right`}>Amount</th>
            <OpenColumnHead />
          </tr>
        </thead>
        <tbody onKeyDown={moveRowFocus}>
          {entries.map((entry) => {
            const signed = signedLedgerCents(entry);
            return (
              <tr
                key={entry.id}
                aria-current={entry.id === openId ? "true" : undefined}
                className={`${TABLE_ROW} align-top last:border-b-0`}
              >
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-muted-foreground tabular-nums">
                  {formatDateWithYear(entry.entryDate)}
                </td>
                <td className="min-w-48 px-4 py-2.5">
                  <button
                    type="button"
                    data-row
                    onClick={() => onOpen(entry.id)}
                    className={ROW_OPENER}
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
                <ChevronCell />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

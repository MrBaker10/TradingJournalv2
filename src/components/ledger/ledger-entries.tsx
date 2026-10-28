"use client";

import { Plus } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import type { LedgerAccount, LedgerEntryRow } from "@/db/queries/ledger";
import type { IsoDate } from "@/domain/streak";
import { LedgerSheet, type LedgerSheetTarget } from "./ledger-sheet";
import { LedgerTable } from "./ledger-table";

/**
 * The ledger page's body: "Add entry", the table and the one sheet both open.
 * The open entry is component state, not the URL: nothing links to a ledger
 * entry. It is looked up in the current rows, so a save shows the fresh row
 * and a deleted entry closes the sheet.
 */
export function LedgerEntries({
  header,
  filters,
  totals,
  entries,
  filtered,
  accounts,
  today,
}: {
  header: ReactNode;
  filters: ReactNode;
  totals: ReactNode;
  entries: LedgerEntryRow[];
  /** A filter is active: an empty list then means no match, not no ledger. */
  filtered: boolean;
  /** What an entry may be tied to: the user's real, active accounts. */
  accounts: LedgerAccount[];
  /** Today in the user's timezone, the date a new entry starts with. */
  today: IsoDate;
}) {
  const [open, setOpen] = useState<number | "new" | null>(null);
  // The open entry's last row: an edit can move it out of the active filter,
  // and the sheet must still confirm the save. A delete closes the sheet
  // itself, so a stale row is never shown as current.
  const [lastOpen, setLastOpen] = useState<LedgerEntryRow | null>(null);
  const fresh =
    typeof open === "number"
      ? entries.find((entry) => entry.id === open)
      : undefined;
  if (fresh && fresh !== lastOpen) setLastOpen(fresh);
  const openEntry =
    fresh ??
    (typeof open === "number" && lastOpen?.id === open ? lastOpen : undefined);
  const target: LedgerSheetTarget | null =
    open === "new"
      ? { kind: "new" }
      : openEntry
        ? { kind: "entry", entry: openEntry }
        : null;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        {header}
        <Button size="lg" className="h-10 px-4" onClick={() => setOpen("new")}>
          <Plus aria-hidden="true" />
          Add entry
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
        {filters}
        {totals}
      </div>
      {entries.length === 0 ? (
        <p className="mx-auto max-w-md py-10 text-center text-muted-foreground text-sm">
          {filtered
            ? "No entries match this filter. Widen the dates or pick All accounts."
            : "Nothing in the ledger yet. Add what prop trading costs you — evaluations, resets, activations, subscriptions, data — and every payout you receive."}
        </p>
      ) : (
        <LedgerTable
          entries={entries}
          openId={target?.kind === "entry" ? target.entry.id : null}
          onOpen={setOpen}
        />
      )}
      <LedgerSheet
        target={target}
        accounts={accounts}
        today={today}
        onClose={() => setOpen(null)}
      />
    </>
  );
}

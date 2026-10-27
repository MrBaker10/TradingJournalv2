"use client";

import { ChevronRight } from "lucide-react";
import { calendarDateOf, formatDayLabel } from "@/lib/time";

export interface ArchivedAccountData {
  id: number;
  name: string;
  archivedAt: Date;
  /** Trades or ledger entries point at it: it can only stay archived. */
  inUse: boolean;
}

/**
 * The archived accounts under the accounts table (Design.md §3.8). A row
 * opens the account's sheet, where it can be restored or deleted.
 */
export function ArchivedAccountsList({
  accounts,
  timeZone,
  onOpen,
}: {
  accounts: ArchivedAccountData[];
  /** `archived_at` is an instant; the day it falls on is the user's to decide. */
  timeZone: string;
  onOpen: (accountId: number) => void;
}) {
  if (accounts.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-muted-foreground text-xs">Archived</h3>
      <ul className="flex flex-col">
        {accounts.map((account) => (
          <li key={account.id} className="border-b last:border-b-0">
            <button
              type="button"
              onClick={() => onOpen(account.id)}
              className="group flex min-h-10 w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm outline-none transition-colors duration-150 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="min-w-0 flex-1 truncate">{account.name}</span>
              <span className="shrink-0 text-muted-foreground text-xs">
                Archived{" "}
                {formatDayLabel(calendarDateOf(account.archivedAt, timeZone))}
              </span>
              <ChevronRight
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-[translate] duration-150 group-hover:translate-x-0.5"
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

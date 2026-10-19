"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { LedgerAccount } from "@/db/queries/ledger";
import { buildHref, type SearchParamMap } from "@/lib/search-params";

interface LedgerFilterBarProps {
  /** The accounts the filter offers (`listLedgerFilterAccounts`). */
  accounts: LedgerAccount[];
}

const FILTER_FIELD_CLASS =
  "h-10 w-full rounded-ctl border border-white/12 bg-well px-3 text-fg text-sm transition-colors hover:border-cyan/35 focus:border-cyan focus:shadow-[var(--shadow-focus)] focus:outline-none sm:w-auto";

// Design.md §4.25: the page's own account filter and a range of entry dates,
// mirrored into searchParams like the analytics range. The server checks the
// account against the user's own; this only writes what was picked. The
// fields stay uncontrolled for the reason given in RangeFilter, and their
// `key` remounts them when the URL changes without them — back, forward, a
// link — so they never claim a filter the list does not show.
export function LedgerFilterBar({ accounts }: LedgerFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current: SearchParamMap = Object.fromEntries(searchParams.entries());

  function update(overrides: SearchParamMap) {
    router.push(buildHref("/ledger", current, overrides));
  }

  return (
    <div className="card-surface edge flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex flex-col gap-1">
        <label htmlFor="ledger-filter-account" className="cap">
          Account
        </label>
        <select
          id="ledger-filter-account"
          key={current.account ?? ""}
          defaultValue={current.account ?? ""}
          onChange={(event) =>
            update({ account: event.target.value || undefined })
          }
          className={FILTER_FIELD_CLASS}
        >
          <option value="">All accounts</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="ledger-filter-from" className="cap">
          From
        </label>
        <input
          id="ledger-filter-from"
          key={current.from ?? ""}
          type="date"
          defaultValue={current.from ?? ""}
          onChange={(event) =>
            update({ from: event.target.value || undefined })
          }
          className={FILTER_FIELD_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="ledger-filter-to" className="cap">
          To
        </label>
        <input
          id="ledger-filter-to"
          key={current.to ?? ""}
          type="date"
          defaultValue={current.to ?? ""}
          onChange={(event) => update({ to: event.target.value || undefined })}
          className={FILTER_FIELD_CLASS}
        />
      </div>
    </div>
  );
}

"use client";

import { useSearchParams } from "next/navigation";
import { SELECT_CLASS } from "@/components/settings/fields";
import { FieldLabel } from "@/components/trades/form-blocks";
import { Input } from "@/components/ui/input";
import type { LedgerAccount } from "@/db/queries/ledger";
import { useRouter } from "@/lib/i18n/navigation";
import { buildHref, type SearchParamMap } from "@/lib/search-params";

interface LedgerFilterBarProps {
  /** The accounts the filter offers (`listLedgerFilterAccounts`). */
  accounts: LedgerAccount[];
}

// The page's own account filter and a range of entry dates,
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
    router.push(buildHref("/ledger", current, overrides), { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex flex-col gap-1 sm:w-48">
        <FieldLabel htmlFor="ledger-filter-account">Account</FieldLabel>
        <select
          id="ledger-filter-account"
          key={current.account ?? ""}
          defaultValue={current.account ?? ""}
          onChange={(event) =>
            update({ account: event.target.value || undefined })
          }
          className={SELECT_CLASS}
        >
          <option value="">All accounts</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1 sm:w-48">
        <FieldLabel htmlFor="ledger-filter-from">From</FieldLabel>
        <Input
          id="ledger-filter-from"
          key={current.from ?? ""}
          type="date"
          defaultValue={current.from ?? ""}
          onChange={(event) =>
            update({ from: event.target.value || undefined })
          }
          className="h-10 font-mono tabular-nums"
        />
      </div>

      <div className="flex flex-col gap-1 sm:w-48">
        <FieldLabel htmlFor="ledger-filter-to">To</FieldLabel>
        <Input
          id="ledger-filter-to"
          key={current.to ?? ""}
          type="date"
          defaultValue={current.to ?? ""}
          onChange={(event) => update({ to: event.target.value || undefined })}
          className="h-10 font-mono tabular-nums"
        />
      </div>
    </div>
  );
}

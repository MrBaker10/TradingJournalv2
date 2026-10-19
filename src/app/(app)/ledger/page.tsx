import { LedgerEntryForm } from "@/components/ledger/ledger-entry-form";
import { LedgerList } from "@/components/ledger/ledger-list";
import { listLedgerEntries } from "@/db/queries/ledger";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { todayInTimeZone } from "@/lib/time";

// Real money around the user's prop trading, kept apart from trading P&L
// (docs/adr/0002). The account selector does not scope this page: an entry
// without an account would otherwise vanish whenever one is selected.
export default async function LedgerPage() {
  const user = await getCurrentUser();
  const entries = await listLedgerEntries(user.id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="page-title">Ledger</h1>
      <p className="text-fg-subtle text-xs">
        Real money around your prop trading — kept apart from your trading P&L.
      </p>

      <LedgerEntryForm today={todayInTimeZone(user.timezone)} />
      <LedgerList entries={entries} />
    </div>
  );
}

import { LedgerEntryForm } from "@/components/ledger/ledger-entry-form";
import { LedgerList } from "@/components/ledger/ledger-list";
import { LedgerTotalsCard } from "@/components/ledger/ledger-totals-card";
import {
  getLedgerTotals,
  listLedgerAccounts,
  listLedgerEntries,
} from "@/db/queries/ledger";
import { withDisplayCurrency } from "@/db/queries/scope";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { todayInTimeZone } from "@/lib/time";

// Real money around the user's prop trading, kept apart from trading P&L
// (docs/adr/0002). The account selector does not scope this page: an entry
// without an account would otherwise vanish whenever one is selected. Totals
// are therefore in the "All accounts" display currency.
export default async function LedgerPage() {
  const user = await getCurrentUser();
  // Only the totals wait for the currency.
  const [entries, accounts, { currency, totals }] = await Promise.all([
    listLedgerEntries(user.id),
    listLedgerAccounts(user.id),
    withDisplayCurrency({ userId: user.id, selectedAccountId: null }).then(
      async ({ currency }) => ({
        currency,
        totals: await getLedgerTotals(user.id, currency),
      }),
    ),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="page-title">Ledger</h1>
      <p className="text-fg-subtle text-xs">
        Real money around your prop trading — kept apart from your trading P&L.
      </p>

      <LedgerTotalsCard totals={totals} currency={currency} />
      <LedgerEntryForm
        today={todayInTimeZone(user.timezone)}
        accounts={accounts}
      />
      <LedgerList entries={entries} />
    </div>
  );
}

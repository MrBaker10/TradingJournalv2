import { isValid, parseISO } from "date-fns";
import { LedgerEntries } from "@/components/ledger/ledger-entries";
import { LedgerFilterBar } from "@/components/ledger/ledger-filter-bar";
import { LedgerTotals } from "@/components/ledger/ledger-totals";
import {
  getLedgerTotals,
  isLedgerFilterActive,
  type LedgerAccount,
  type LedgerFilter,
  listLedgerAccounts,
  listLedgerEntries,
  listLedgerFilterAccounts,
} from "@/db/queries/ledger";
import { withDisplayCurrency } from "@/db/queries/scope";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { firstValue } from "@/lib/search-params";
import { todayInTimeZone } from "@/lib/time";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface LedgerPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * A calendar date from the URL, or nothing. The pattern alone would let
 * 2026-02-31 through, and Postgres refuses it with a server error.
 */
function parseDate(value: string | undefined): string | undefined {
  return value && DATE_PATTERN.test(value) && isValid(parseISO(value))
    ? value
    : undefined;
}

/**
 * The account id from the URL, kept only when it is one the filter offers —
 * the user's own. Anything else falls back to all accounts.
 */
function parseAccount(
  value: string | undefined,
  offered: LedgerAccount[],
): number | undefined {
  const id = Number(value);
  return offered.some((account) => account.id === id) ? id : undefined;
}

// Real money around the user's prop trading, kept apart from trading P&L
// (docs/adr/0002). The account selector does not scope this page: an entry
// without an account would otherwise vanish whenever one is selected. The
// page filters itself instead, and totals are in the "All accounts" display
// currency.
export default async function LedgerPage({ searchParams }: LedgerPageProps) {
  const rawParams = await searchParams;
  const user = await getCurrentUser();
  const [filterAccounts, formAccounts, { currency }] = await Promise.all([
    listLedgerFilterAccounts(user.id),
    listLedgerAccounts(user.id),
    withDisplayCurrency({ userId: user.id, selectedAccountId: null }),
  ]);

  const filter: LedgerFilter = {
    accountId: parseAccount(firstValue(rawParams.account), filterAccounts),
    from: parseDate(firstValue(rawParams.from)),
    to: parseDate(firstValue(rawParams.to)),
  };
  // List and totals read the same filter, so the figures match the list.
  const [entries, totals] = await Promise.all([
    listLedgerEntries(user.id, filter),
    getLedgerTotals(user.id, currency, filter),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <LedgerEntries
        header={
          <header className="flex flex-col gap-1">
            <h1 className="page-title">Ledger</h1>
            <p className="text-muted-foreground text-xs">
              Real money around your prop trading — kept apart from your trading
              P&L.
            </p>
          </header>
        }
        filters={<LedgerFilterBar accounts={filterAccounts} />}
        totals={<LedgerTotals totals={totals} currency={currency} />}
        entries={entries}
        filtered={isLedgerFilterActive(filter)}
        accounts={formAccounts}
        today={todayInTimeZone(user.timezone)}
      />
    </div>
  );
}

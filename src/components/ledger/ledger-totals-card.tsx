import { MetricCell } from "@/components/dashboard/metric-cell";
import type { LedgerTotals } from "@/db/queries/ledger";
import { type DisplayCurrency, formatCents } from "@/lib/money";

interface LedgerTotalsCardProps {
  totals: LedgerTotals;
  /** The "All accounts" display currency (display-currency). */
  currency: DisplayCurrency;
}

// Design.md §4.25: the metric grid of §4.7 with three cells. Real money, so
// semantic colour by sign and never a glow. An expense reads as a loss, like
// its row in the list; zero carries no sign. The figures arrive finished
// from the query.
export function LedgerTotalsCard({ totals, currency }: LedgerTotalsCardProps) {
  const context = `In ${currency}`;
  return (
    <section className="card-surface edge overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-3">
        <MetricCell
          label="Payouts"
          value={formatCents(totals.payoutsCents, { signed: true, currency })}
          context={context}
          tone="money"
          sign={totals.payoutsCents}
        />
        <MetricCell
          label="Expenses"
          value={formatCents(
            totals.expensesCents === 0 ? 0 : -totals.expensesCents,
            { currency },
          )}
          context={context}
          tone="money"
          sign={-totals.expensesCents}
        />
        <MetricCell
          label="Ledger net"
          value={formatCents(totals.netCents, { signed: true, currency })}
          context={context}
          tone="money"
          sign={totals.netCents}
        />
      </div>
    </section>
  );
}

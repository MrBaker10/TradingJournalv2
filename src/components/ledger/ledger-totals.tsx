import { MetricRow } from "@/components/dashboard/metric-row";
import { TermInfo } from "@/components/terms/term-info";
import type { LedgerTotals as LedgerTotalsData } from "@/db/queries/ledger";
import { signedLedgerCents } from "@/domain/ledger";
import { moneyTone } from "@/lib/dashboard/sign-tone";
import { type DisplayCurrency, formatCents } from "@/lib/money";

/**
 * Payouts, expenses and the ledger net as a mono key/value list like the
 * dashboard's money metrics (Design.md §3.2). Real money: sign colour and
 * nothing else; an expense reads as money going out, like its row. The
 * figures arrive finished from the query.
 */
export function LedgerTotals({
  totals,
  currency,
}: {
  totals: LedgerTotalsData;
  /** The "All accounts" display currency (display-currency). */
  currency: DisplayCurrency;
}) {
  const expenses = signedLedgerCents({
    kind: "expense",
    amountCents: totals.expensesCents,
  });
  return (
    <section aria-label="Ledger totals">
      <dl className="font-mono text-[13px]">
        <MetricRow
          label="Payouts"
          note={currency}
          tone={moneyTone(totals.payoutsCents)}
        >
          {formatCents(totals.payoutsCents, { signed: true, currency })}
        </MetricRow>
        <MetricRow label="Expenses" note={currency} tone={moneyTone(expenses)}>
          {formatCents(expenses, { currency })}
        </MetricRow>
        <MetricRow
          label="Ledger net"
          info={<TermInfo term="ledgerNet" />}
          note={currency}
          tone={moneyTone(totals.netCents)}
        >
          {formatCents(totals.netCents, { signed: true, currency })}
        </MetricRow>
      </dl>
    </section>
  );
}

import { useLocale } from "next-intl";
import type { JournalTradeRow } from "@/db/queries/trades";
import { formatR } from "@/lib/analytics/format";
import { moneyTone, SIGN_TEXT, signOf } from "@/lib/dashboard/sign-tone";
import { Link } from "@/lib/i18n/navigation";
import { type DisplayCurrency, formatCents } from "@/lib/money";
import { formatNumericDate } from "@/lib/time";

/**
 * The last few entries under the equity curve, a dense mono table. A missed
 * setup is a row like any other, named "missed" in words; its R is the
 * would-be R, plain rather than in a sign colour, and it has no P&L.
 */
export function RecentEntries({
  trades,
  currency,
}: {
  trades: JournalTradeRow[];
  /** The display currency of `displayPnlCents` (display-currency). */
  currency: DisplayCurrency;
}) {
  const language = useLocale();
  return (
    <section aria-labelledby="recent-entries-heading">
      <h2
        id="recent-entries-heading"
        className="mb-2 text-[11px] text-muted-foreground uppercase tracking-wider"
      >
        Recent entries
      </h2>
      {trades.length === 0 ? (
        <p className="py-4 text-muted-foreground text-sm">
          Nothing logged yet. A missed setup counts the same as a trade.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap font-mono text-[13px]">
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id} className="border-b hover:bg-accent/40">
                  <td className="py-2.5 lg:py-1.5 pr-3 text-muted-foreground">
                    {formatNumericDate(trade.tradeDate, language)}
                  </td>
                  <td className="py-2.5 lg:py-1.5 pr-3">
                    <Link
                      href={`/journal/${trade.id}`}
                      className="rounded-sm underline-offset-2 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {trade.instrumentSymbol}
                    </Link>
                  </td>
                  <td className="py-2.5 lg:py-1.5 pr-3 text-muted-foreground">
                    {trade.taken ? trade.direction : "missed"}
                  </td>
                  <td className="py-2.5 lg:py-1.5 pr-3 text-muted-foreground">
                    {trade.grade ?? ""}
                  </td>
                  <td
                    className={`py-2.5 pr-3 text-right lg:py-1.5 ${trade.taken && trade.rMultiple !== null ? SIGN_TEXT[signOf(trade.rMultiple)] : ""}`}
                  >
                    {trade.rMultiple === null
                      ? ""
                      : `${formatR(trade.rMultiple, language)}${trade.taken ? "" : " would-be"}`}
                  </td>
                  <td
                    className={`py-2.5 lg:py-1.5 text-right ${moneyTone(trade.taken ? trade.displayPnlCents : null)}`}
                  >
                    {trade.taken && trade.displayPnlCents !== null
                      ? formatCents(trade.displayPnlCents, {
                          signed: true,
                          currency,
                          language,
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

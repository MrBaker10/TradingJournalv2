import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TradeDetail } from "@/components/journal/trade-detail";
import { isTradeFxProvisional } from "@/db/queries/fx";
import { withDisplayCurrency } from "@/db/queries/scope";
import { getJournalTradeById } from "@/db/queries/trades";
import { getCurrentUser } from "@/lib/auth/get-current-user";

interface TradeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TradeDetailPage({
  params,
}: TradeDetailPageProps) {
  // Next 16: params is a Promise (coding-standards.md).
  const { id } = await params;
  const tradeId = Number.parseInt(id, 10);
  if (!Number.isInteger(tradeId) || tradeId <= 0) notFound();

  const user = await getCurrentUser();
  // Returns null for a foreign trade just as it does for a missing one, so
  // this page cannot be used to find out which ids exist.
  // The same display currency as the journal and the dashboard, from the
  // selected scope — a trade on several accounts reads in the currency of the
  // view it was opened from (decided 2026-09-25, display-currency).
  const { currency } = await withDisplayCurrency({
    userId: user.id,
    selectedAccountId: user.selectedAccountId,
  });
  const trade = await getJournalTradeById(user.id, tradeId, { currency });
  if (!trade) notFound();

  const fxProvisional =
    trade.fxRateDate !== null &&
    (await isTradeFxProvisional(user.id, trade.id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/journal"
          className="flex items-center gap-1.5 text-fg-subtle text-sm transition-colors duration-150 hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Trade Journal
        </Link>
        <Link
          href={`/journal/${trade.id}/edit`}
          className="flex h-10 items-center gap-1.5 rounded-ctl bg-[image:var(--gradient-info-soft)] px-4 font-medium text-fg text-sm shadow-[var(--shadow-info-soft)]"
        >
          <Pencil className="h-3.5 w-3.5 text-cyan" aria-hidden="true" />
          Edit
        </Link>
      </div>

      <TradeDetail
        trade={trade}
        fxProvisional={fxProvisional}
        currency={currency}
      />
    </div>
  );
}

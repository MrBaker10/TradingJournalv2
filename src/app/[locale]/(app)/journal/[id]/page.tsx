import { ArrowLeft, Pencil } from "lucide-react";
import { notFound } from "next/navigation";
import { TradeDetailBody } from "@/components/journal/trade-detail-body";
import { buttonVariants } from "@/components/ui/button";
import { isTradeFxProvisional } from "@/db/queries/fx";
import { withDisplayCurrency } from "@/db/queries/scope";
import { getJournalTradeById } from "@/db/queries/trades";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { Link } from "@/lib/i18n/navigation";

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

  // Design.md §3.3: the same content as the journal's detail sheet, at the
  // trade's own URL so it can be linked and bookmarked.
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/journal"
          className={buttonVariants({
            variant: "ghost",
            className: "-ml-2.5 h-10 lg:h-8",
          })}
        >
          <ArrowLeft aria-hidden="true" />
          Trade Journal
        </Link>
        <Link
          href={`/journal/${trade.id}/edit`}
          className={buttonVariants({
            variant: "outline",
            className: "h-10 lg:h-8",
          })}
        >
          <Pencil aria-hidden="true" />
          Edit
        </Link>
      </div>

      <TradeDetailBody
        trade={trade}
        currency={currency}
        fxProvisional={fxProvisional}
      />
    </div>
  );
}

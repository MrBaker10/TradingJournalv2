import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TradeForm } from "@/components/trades/trade-form";
import { listAssignableAccounts } from "@/db/queries/accounts";
import { listCommissionRates } from "@/db/queries/commission-rates";
import { listInstruments } from "@/db/queries/instruments";
import {
  getJournalTradeById,
  listConfluenceGroups,
  listMistakeTags,
} from "@/db/queries/trades";
import { getCurrentUser } from "@/lib/auth/get-current-user";

interface EditTradePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTradePage({ params }: EditTradePageProps) {
  const { id } = await params;
  const tradeId = Number.parseInt(id, 10);
  if (!Number.isInteger(tradeId) || tradeId <= 0) notFound();

  const user = await getCurrentUser();
  const trade = await getJournalTradeById(user.id, tradeId);
  if (!trade) notFound();

  // Not listActiveAccountsForSwitcher, which the new-trade page uses: an
  // archived account this trade already sits on has to stay in the list, or
  // saving would drop an assignment the user never touched. updateTrade reads
  // the same query, so the options here and the ids the server accepts are
  // the same set.
  const [accounts, instruments, confluenceGroups, mistakeTags] =
    await Promise.all([
      listAssignableAccounts(user.id, trade.id),
      listInstruments(),
      listConfluenceGroups(),
      listMistakeTags(),
    ]);
  const commissionRates = await listCommissionRates(
    user.id,
    accounts.map((account) => account.id),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href={`/journal/${trade.id}`}
          className="flex w-fit items-center gap-1.5 text-fg-subtle text-sm transition-colors duration-150 hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to trade
        </Link>
        <h1 className="page-title">
          Edit {trade.instrumentSymbol} · {trade.tradeDate}
        </h1>
      </div>

      <TradeForm
        mode="edit"
        trade={trade}
        instruments={instruments}
        accounts={accounts}
        commissionRates={commissionRates}
        confluenceGroups={confluenceGroups}
        mistakeTags={mistakeTags}
      />
    </div>
  );
}

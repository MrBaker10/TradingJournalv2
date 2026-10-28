import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TradeForm } from "@/components/trades/trade-form";
import { buttonVariants } from "@/components/ui/button";
import { listAssignableAccounts } from "@/db/queries/accounts";
import { listCommissionRates } from "@/db/queries/commission-rates";
import { listInstruments } from "@/db/queries/instruments";
import { listStrategies } from "@/db/queries/strategies";
import {
  getJournalTradeById,
  listConfluenceGroups,
  listMistakeTags,
} from "@/db/queries/trades";
import { isDemoUsername } from "@/domain/demo";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { strategyOptions } from "@/lib/trades/strategy-options";

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
  // saving would drop an assignment the user never touched. saveTrade reads
  // the same query, so the options here and the ids the server accepts are
  // the same set.
  const [accounts, instruments, strategies, confluenceGroups, mistakeTags] =
    await Promise.all([
      listAssignableAccounts(user.id, trade.id),
      listInstruments(),
      listStrategies(user.id),
      listConfluenceGroups(),
      listMistakeTags(),
    ]);
  const commissionRates = await listCommissionRates(
    user.id,
    accounts.map((account) => account.id),
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href={`/journal/${trade.id}`}
          className={buttonVariants({
            variant: "ghost",
            className: "-ml-2.5 h-10 w-fit lg:h-8",
          })}
        >
          <ArrowLeft aria-hidden="true" />
          Back to trade
        </Link>
        <h1 className="font-semibold text-muted-foreground text-sm">
          Edit <span className="text-foreground">{trade.instrumentSymbol}</span>{" "}
          · <span className="font-mono tabular-nums">{trade.tradeDate}</span>
        </h1>
      </div>

      <TradeForm
        mode="edit"
        trade={trade}
        instruments={instruments}
        strategies={strategyOptions(
          strategies,
          trade.strategy?.strategyId ?? null,
        )}
        accounts={accounts}
        commissionRates={commissionRates}
        confluenceGroups={confluenceGroups}
        mistakeTags={mistakeTags}
        screenshotUploads={!isDemoUsername(user.username)}
      />
    </div>
  );
}

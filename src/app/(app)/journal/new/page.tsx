import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TradeForm } from "@/components/trades/trade-form";
import { buttonVariants } from "@/components/ui/button";
import { listActiveAccountsForSwitcher } from "@/db/queries/accounts";
import { listCommissionRates } from "@/db/queries/commission-rates";
import { listInstruments } from "@/db/queries/instruments";
import { listStrategies } from "@/db/queries/strategies";
import { listConfluenceGroups, listMistakeTags } from "@/db/queries/trades";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { strategyOptions } from "@/lib/trades/strategy-options";

export default async function NewTradePage() {
  const user = await getCurrentUser();
  const [accounts, instruments, strategies, confluenceGroups, mistakeTags] =
    await Promise.all([
      listActiveAccountsForSwitcher(user.id),
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
      <Link
        href="/journal"
        className={buttonVariants({
          variant: "ghost",
          className: "-ml-2.5 h-10 w-fit lg:h-8",
        })}
      >
        <ArrowLeft aria-hidden="true" />
        Trade Journal
      </Link>
      <h1 className="sr-only">Log trade</h1>
      <TradeForm
        mode="create"
        instruments={instruments}
        strategies={strategyOptions(strategies, null)}
        accounts={accounts}
        commissionRates={commissionRates}
        confluenceGroups={confluenceGroups}
        mistakeTags={mistakeTags}
      />
    </div>
  );
}

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TradeForm } from "@/components/trades/trade-form";
import { listActiveAccountsForSwitcher } from "@/db/queries/accounts";
import { listInstruments } from "@/db/queries/instruments";
import { listConfluenceGroups, listMistakeTags } from "@/db/queries/trades";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export default async function NewTradePage() {
  const user = await getCurrentUser();
  const [accounts, instruments, confluenceGroups, mistakeTags] =
    await Promise.all([
      listActiveAccountsForSwitcher(user.id),
      listInstruments(),
      listConfluenceGroups(),
      listMistakeTags(),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/journal"
          className="flex w-fit items-center gap-1.5 text-fg-subtle text-sm transition-colors duration-150 hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Trade Journal
        </Link>
        <h1 className="page-title">New Trade</h1>
      </div>
      <TradeForm
        mode="create"
        instruments={instruments}
        accounts={accounts}
        confluenceGroups={confluenceGroups}
        mistakeTags={mistakeTags}
      />
    </div>
  );
}

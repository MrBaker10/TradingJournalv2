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
      <h1 className="page-title">New Trade</h1>
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

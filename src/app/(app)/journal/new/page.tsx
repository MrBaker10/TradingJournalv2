import { NewTradeForm } from "@/components/trades/new-trade-form";
import { listActiveAccountsForSwitcher } from "@/db/queries/accounts";
import { listInstruments } from "@/db/queries/instruments";
import { listConfluenceTags, listMistakeTags } from "@/db/queries/trades";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export default async function NewTradePage() {
  const user = await getCurrentUser();
  const [accounts, instruments, confluenceTags, mistakeTags] =
    await Promise.all([
      listActiveAccountsForSwitcher(user.id),
      listInstruments(),
      listConfluenceTags(),
      listMistakeTags(),
    ]);

  const confluenceGroups = Array.from(
    confluenceTags.reduce((groups, tag) => {
      const existing = groups.get(tag.group) ?? [];
      existing.push({ id: tag.id, label: tag.label });
      groups.set(tag.group, existing);
      return groups;
    }, new Map<string, { id: number; label: string }[]>()),
  ).map(([group, tags]) => ({ group, tags }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="page-title">New Trade</h1>
      <NewTradeForm
        instruments={instruments}
        accounts={accounts}
        confluenceGroups={confluenceGroups}
        mistakeTags={mistakeTags}
      />
    </div>
  );
}

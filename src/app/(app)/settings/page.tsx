import { AccountsManager } from "@/components/settings/accounts-manager";
import { ExportCard } from "@/components/settings/export-card";
import { listAllAccountsForSettings } from "@/db/queries/accounts";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const accounts = await listAllAccountsForSettings(user.id);
  const active = accounts.filter((account) => account.archivedAt === null);
  const archived = accounts
    .filter((account) => account.archivedAt !== null)
    .map((account) => ({ ...account, archivedAt: account.archivedAt as Date }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="page-title">Settings</h1>
      <AccountsManager active={active} archived={archived} />
      <div className="max-w-4xl">
        <ExportCard />
      </div>
    </div>
  );
}

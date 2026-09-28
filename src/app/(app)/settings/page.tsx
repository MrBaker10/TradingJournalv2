import { AccountsManager } from "@/components/settings/accounts-manager";
import { ExportCard } from "@/components/settings/export-card";
import { SecuritySection } from "@/components/settings/security-section";
import { listAllAccountsForSettings } from "@/db/queries/accounts";
import { listCommissionRates } from "@/db/queries/commission-rates";
import { listInstruments } from "@/db/queries/instruments";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const accounts = await listAllAccountsForSettings(user.id);
  const [rates, instruments] = await Promise.all([
    listCommissionRates(
      user.id,
      accounts.map((account) => account.id),
    ),
    listInstruments(),
  ]);
  const active = accounts
    .filter((account) => account.archivedAt === null)
    .map((account) => ({
      ...account,
      commissionRates: rates.filter((rate) => rate.accountId === account.id),
    }));
  const archived = accounts
    .filter((account) => account.archivedAt !== null)
    .map((account) => ({ ...account, archivedAt: account.archivedAt as Date }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="page-title">Settings</h1>
      <AccountsManager
        active={active}
        archived={archived}
        instruments={instruments.map((instrument) => ({
          id: instrument.id,
          symbol: instrument.symbol,
        }))}
        timeZone={user.timezone}
      />
      <div className="max-w-4xl">
        <ExportCard />
      </div>
      <div className="max-w-4xl">
        <SecuritySection
          username={user.displayUsername ?? user.username}
          twoFactorEnabled={user.twoFactorEnabled}
        />
      </div>
    </div>
  );
}

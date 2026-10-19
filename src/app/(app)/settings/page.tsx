import { AccountsManager } from "@/components/settings/accounts-manager";
import { ExportCard } from "@/components/settings/export-card";
import { SecuritySection } from "@/components/settings/security-section";
import { getAttemptDays, listAccountRules } from "@/db/queries/account-rules";
import { listAllAccountsForSettings } from "@/db/queries/accounts";
import { listCommissionRates } from "@/db/queries/commission-rates";
import { listInstruments } from "@/db/queries/instruments";
import { listProgramOptions } from "@/db/queries/prop-firms";
import { amountToCents } from "@/domain/commission";
import { evaluateRules } from "@/domain/rule-status";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { todayInTimeZone } from "@/lib/time";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const accounts = await listAllAccountsForSettings(user.id);
  const [rates, instruments, rules, programs] = await Promise.all([
    listCommissionRates(
      user.id,
      accounts.map((account) => account.id),
    ),
    listInstruments(),
    listAccountRules(user.id),
    listProgramOptions(),
  ]);
  const today = todayInTimeZone(user.timezone);
  // One day-series read per linked active account; an account has at most
  // one link and a trader only a handful of linked accounts.
  const active = await Promise.all(
    accounts
      .filter((account) => account.archivedAt === null)
      .map(async (account) => {
        const link = rules.find((row) => row.accountId === account.id) ?? null;
        return {
          ...account,
          commissionRates: rates.filter(
            (rate) => rate.accountId === account.id,
          ),
          rules: link,
          ruleStatus: link
            ? evaluateRules({
                rules: link,
                startingBalanceCents: amountToCents(account.startingBalanceUsd),
                days: await getAttemptDays(user.id, account.id),
                today,
              })
            : null,
        };
      }),
  );
  const archived = accounts
    .filter((account) => account.archivedAt !== null)
    .map((account) => ({
      ...account,
      archivedAt: account.archivedAt as Date,
      inUse: account.hasTrades || account.hasLedgerEntries,
    }));

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
        programs={programs}
        today={today}
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

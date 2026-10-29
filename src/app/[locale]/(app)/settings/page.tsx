import { ChecklistTemplate } from "@/components/settings/checklist-template";
import { ExportCard } from "@/components/settings/export-card";
import { LanguageSwitch } from "@/components/settings/language-switch";
import { SecuritySection } from "@/components/settings/security-section";
import { SettingsAccounts } from "@/components/settings/settings-accounts";
import { SettingsSection } from "@/components/settings/settings-section";
import { listAccountRules } from "@/db/queries/account-rules";
import { listAllAccountsForSettings } from "@/db/queries/accounts";
import { listChecklistItems } from "@/db/queries/checklist";
import { listCommissionRates } from "@/db/queries/commission-rates";
import { listInstruments } from "@/db/queries/instruments";
import { listProgramOptions } from "@/db/queries/prop-firms";
import { getSetupGuide } from "@/db/queries/setup-guide";
import { isDemoUsername } from "@/domain/demo";
import { worstRuleState } from "@/domain/rule-status";
import { nextSetupGuideState } from "@/domain/setup-guide";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { storedLanguageOf } from "@/lib/i18n/languages";
import { loadRuleStatus } from "@/lib/prop-firms/rule-status";
import { todayInTimeZone } from "@/lib/time";

// Settings on one page (Design.md §3.8). The open account sheet is the
// client's `account` search parameter, resolved against the accounts loaded
// here — the user's own — so a foreign id opens nothing.
export default async function SettingsPage() {
  const user = await getCurrentUser();
  const accounts = await listAllAccountsForSettings(user.id);
  const [rates, instruments, rules, programs, checklistItems, setupGuide] =
    await Promise.all([
      listCommissionRates(
        user.id,
        accounts.map((account) => account.id),
      ),
      listInstruments(),
      listAccountRules(user.id),
      listProgramOptions(),
      listChecklistItems(user.id),
      getSetupGuide(user.id),
    ]);
  const today = todayInTimeZone(user.timezone);
  // One attempt read per linked active account; an account has at most one
  // link and a trader only a handful of linked accounts.
  const active = await Promise.all(
    accounts
      .filter((account) => account.archivedAt === null)
      .map(async (account) => {
        const link = rules.find((row) => row.accountId === account.id) ?? null;
        const attempt = link && (await loadRuleStatus(user.id, link, today));
        return {
          ...account,
          commissionRates: rates.filter(
            (rate) => rate.accountId === account.id,
          ),
          rules: link,
          attempt,
          ruleState: attempt ? worstRuleState(attempt.status) : null,
        };
      }),
  );
  const archived = accounts
    .filter((account) => account.archivedAt !== null)
    .map((account) => ({
      id: account.id,
      name: account.name,
      archivedAt: account.archivedAt as Date,
      inUse: account.hasTrades || account.hasLedgerEntries,
    }));

  return (
    <SettingsAccounts
      active={active}
      archived={archived}
      instruments={instruments.map((instrument) => ({
        id: instrument.id,
        symbol: instrument.symbol,
      }))}
      programs={programs}
      today={today}
      timeZone={user.timezone}
      offerSetupGuide={nextSetupGuideState(setupGuide, "show") !== null}
    >
      <SettingsSection
        id="checklist"
        hint="Your routine, in three phases. Up to 20 steps per phase, 120 characters per step."
      >
        <ChecklistTemplate items={checklistItems} />
      </SettingsSection>
      <SettingsSection id="data">
        <ExportCard />
      </SettingsSection>
      <SettingsSection id="language">
        <LanguageSwitch stored={storedLanguageOf(user)} />
      </SettingsSection>
      {/* From lg the last section is at least a screen high, so every
          section can scroll to the top and the table of contents follows. */}
      <SettingsSection id="security" className="lg:min-h-[calc(100vh-1.5rem)]">
        <SecuritySection
          username={user.displayUsername ?? user.username}
          twoFactorEnabled={user.twoFactorEnabled}
          demo={isDemoUsername(user.username)}
        />
      </SettingsSection>
    </SettingsAccounts>
  );
}

"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActiveSection } from "@/hooks/use-active-section";
import type { AccountTarget } from "@/lib/settings/account-param";
import { cn } from "@/lib/utils";
import type { AccountRowData } from "./accounts-table";
import { RuleDot } from "./rule-dot";
import { SETTINGS_SECTIONS, type SettingsSectionId } from "./settings-section";

const SECTION_IDS: readonly SettingsSectionId[] = SETTINGS_SECTIONS.map(
  (section) => section.id,
);

/**
 * The settings table of contents (Design.md §3.8): follows the scroll like
 * the analytics questions (`useActiveSection`). Under Accounts it lists every active
 * account with its practice stripe and rule dot; a click opens its sheet.
 * Hidden below `lg` (Design.md §3.12).
 */
export function SettingsToc({
  accounts,
  openId,
  onOpen,
}: {
  accounts: AccountRowData[];
  openId: AccountTarget;
  onOpen: (target: Exclude<AccountTarget, null>) => void;
}) {
  const t = useTranslations("settings.sections");
  const current = useActiveSection(SECTION_IDS);

  return (
    <nav
      aria-label={t("toc")}
      className="sticky top-6 hidden flex-col gap-0.5 self-start lg:flex"
    >
      {SETTINGS_SECTIONS.map((section) => {
        const active = section.id === current;
        return (
          <div key={section.id} className="flex flex-col gap-0.5">
            <a
              href={`#${section.id}`}
              aria-current={active ? "location" : undefined}
              className={cn(
                "relative rounded-md py-1.5 pr-2 pl-3 text-sm transition-colors duration-150 hover:bg-accent hover:text-foreground",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-foreground"
                />
              )}
              {t(section.id)}
            </a>
            {section.id === "accounts" && (
              <div className="mb-2 flex flex-col gap-0.5 pl-3">
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => onOpen(account.id)}
                    aria-current={account.id === openId ? "true" : undefined}
                    className="flex items-center gap-2 rounded-md px-2 py-1 text-left text-muted-foreground text-xs transition-colors duration-150 hover:bg-accent hover:text-foreground aria-current:bg-muted aria-current:text-foreground"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-3 w-0.5 shrink-0 rounded-full",
                        account.isPractice && "bg-practice",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {account.name}
                      {account.isPractice && (
                        <span className="sr-only"> (practice)</span>
                      )}
                    </span>
                    {account.rules && <RuleDot state={account.ruleState} />}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => onOpen("new")}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-left text-muted-foreground text-xs transition-colors duration-150 hover:bg-accent hover:text-foreground"
                >
                  <Plus aria-hidden="true" className="size-3" />
                  Add account
                </button>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

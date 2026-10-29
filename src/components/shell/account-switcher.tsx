"use client";

import { ChevronsUpDown, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { groupAccountsForSwitcher } from "@/domain/accounts";
import { useSelectAccount } from "@/hooks/use-select-account";

export interface SwitcherAccount {
  id: number;
  name: string;
  isPractice: boolean;
  sortOrder: number;
  archivedAt: Date | null;
}

interface AccountSwitcherProps {
  accounts: SwitcherAccount[];
  selectedAccountId: number | null;
  /**
   * Where it sits (Design.md §3.1): the expanded sidebar, the collapsed icon
   * rail, or the mobile top bar.
   */
  placement?: "sidebar" | "rail" | "topBar";
}

// The menu's radio values: an account id, or this for "All accounts".
const ALL = "all";

export function AccountSwitcher({
  accounts,
  selectedAccountId,
  placement = "sidebar",
}: AccountSwitcherProps) {
  const t = useTranslations("accountSwitcher");
  const { pending, select } = useSelectAccount();
  const { real, practice } = groupAccountsForSwitcher(accounts);
  const selected = accounts.find((account) => account.id === selectedAccountId);
  const label = selected?.name ?? t("allAccounts");
  const isPractice = selected?.isPractice ?? false;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t(isPractice ? "triggerPractice" : "trigger", {
          name: label,
        })}
        className={`flex items-center gap-2 rounded-md text-left text-sm transition-[background-color,scale] duration-150 hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.98] data-[popup-open]:bg-sidebar-accent ${
          placement === "rail"
            ? "h-10 w-10 justify-center"
            : placement === "topBar"
              ? "h-11 max-w-[45vw] min-w-0 px-2"
              : "h-10 w-full min-w-0 px-2"
        }`}
      >
        <span
          aria-hidden="true"
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] text-[11px] font-semibold ${
            isPractice
              ? "bg-practice/20 text-practice-foreground"
              : "bg-sidebar-primary text-sidebar-primary-foreground"
          } ${pending ? "animate-pulse" : ""}`}
        >
          {label.slice(0, 1).toUpperCase()}
        </span>
        {placement !== "rail" && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{label}</span>
              {isPractice && (
                <span className="block truncate text-[11px] leading-none text-practice-foreground">
                  {t("practiceNotInTotals")}
                </span>
              )}
            </span>
            {pending ? (
              <Loader2
                className="h-3.5 w-3.5 shrink-0 animate-spin opacity-70"
                aria-hidden="true"
              />
            ) : (
              <ChevronsUpDown
                className="h-3.5 w-3.5 shrink-0 opacity-50"
                aria-hidden="true"
              />
            )}
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={placement === "rail" ? "right" : "bottom"}
        align={placement === "topBar" ? "end" : "start"}
        className="w-auto min-w-60"
      >
        <DropdownMenuRadioGroup
          value={selectedAccountId === null ? ALL : String(selectedAccountId)}
          onValueChange={(value: string) =>
            select(value === ALL ? null : Number(value))
          }
        >
          {/* Radio items keep a menu open by default; picking an account is
              the whole job of this menu, so it closes. */}
          <DropdownMenuRadioItem value={ALL} closeOnClick>
            {t("allAccounts")}
          </DropdownMenuRadioItem>
          {real.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("accounts")}</DropdownMenuLabel>
                {real.map((account) => (
                  <DropdownMenuRadioItem
                    key={account.id}
                    value={String(account.id)}
                    closeOnClick
                  >
                    <span className="truncate">{account.name}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuGroup>
            </>
          )}
          {practice.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("practiceExcluded")}</DropdownMenuLabel>
                {practice.map((account) => (
                  <DropdownMenuRadioItem
                    key={account.id}
                    value={String(account.id)}
                    closeOnClick
                  >
                    <span className="flex-1 truncate">{account.name}</span>
                    <span className="rounded-sm bg-practice/15 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-practice-foreground uppercase">
                      {t("practice")}
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

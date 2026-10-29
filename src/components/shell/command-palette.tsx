"use client";

import { Plus, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { groupAccountsForSwitcher } from "@/domain/accounts";
import { useSelectAccount } from "@/hooks/use-select-account";
import { useThemePick } from "@/hooks/use-theme-pick";
import { THEME_PICKS, type ThemePick } from "@/lib/theme";
import type { SwitcherAccount } from "./account-switcher";
import { IMPORT_TRADES_HREF, LOG_TRADE_HREF, navGroups } from "./nav-items";
import { THEME_OPTIONS } from "./theme-options";

/**
 * The ⌘K palette (Design.md §3.1): actions, every page, the account switch
 * and the theme in one filtered list. The shell owns the shortcut and the open
 * state. The generated dialog does not wrap its content in a command root,
 * so this does.
 */
export function CommandPalette({
  accounts,
  theme,
  open,
  onOpenChange,
}: {
  accounts: SwitcherAccount[];
  theme: ThemePick;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { select } = useSelectAccount();
  const { pick, choose } = useThemePick(theme);
  const { real, practice } = groupAccountsForSwitcher(accounts);

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  function selectAccount(accountId: number | null) {
    onOpenChange(false);
    select(accountId);
  }

  function chooseTheme(next: ThemePick) {
    onOpenChange(false);
    choose(next);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description="Open a page, run an action, switch the account or the theme"
    >
      <Command>
        <CommandInput placeholder="Type a page, an action, an account or a theme…" />
        <CommandList>
          <CommandEmpty>Nothing matches.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => go(LOG_TRADE_HREF)}>
              <Plus aria-hidden="true" />
              Log trade
              <CommandShortcut>C</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => go(IMPORT_TRADES_HREF)}>
              <Upload aria-hidden="true" />
              Import trades
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          {navGroups.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.items.map(({ href, label, icon: Icon }) => (
                <CommandItem key={href} onSelect={() => go(href)}>
                  <Icon aria-hidden="true" />
                  {label}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandSeparator />
          <CommandGroup heading="Switch account">
            <CommandItem onSelect={() => selectAccount(null)}>
              All accounts
            </CommandItem>
            {real.map((account) => (
              <CommandItem
                key={account.id}
                // Names can repeat a page or action word; the id keeps the
                // item distinct, the visible name is what filtering reads.
                value={`account ${account.id} ${account.name}`}
                onSelect={() => selectAccount(account.id)}
              >
                {account.name}
              </CommandItem>
            ))}
            {practice.map((account) => (
              <CommandItem
                key={account.id}
                value={`account ${account.id} ${account.name} practice`}
                onSelect={() => selectAccount(account.id)}
              >
                {account.name}
                <CommandShortcut className="text-practice-foreground">
                  Practice
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Theme">
            {THEME_PICKS.map((value) => {
              const { label, icon: Icon } = THEME_OPTIONS[value];
              const current = value === pick;
              return (
                <CommandItem
                  key={value}
                  value={`theme ${value}`}
                  keywords={["theme", label]}
                  // The check icon reads data-checked; aria-checked says it.
                  data-checked={current}
                  aria-checked={current}
                  onSelect={() => chooseTheme(value)}
                >
                  <Icon aria-hidden="true" />
                  {label}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

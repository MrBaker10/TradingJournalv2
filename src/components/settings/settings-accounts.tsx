"use client";

import { Plus } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { ProgramOption } from "@/db/queries/prop-firms";
import { DISCARD_ACCOUNT_CHANGES } from "@/hooks/use-unsaved-account";
import {
  type AccountTarget,
  accountSearch,
  resolveAccountParam,
} from "@/lib/settings/account-param";
import type { InstrumentOption } from "./account-commission-rates";
import { AccountSheet } from "./account-sheet";
import { type AccountRowData, AccountsTable } from "./accounts-table";
import {
  type ArchivedAccountData,
  ArchivedAccountsList,
} from "./archived-accounts-list";
import { SettingsSection } from "./settings-section";
import { SettingsToc } from "./settings-toc";

/**
 * The settings page's layout and its Accounts section (Design.md §3.8). The
 * open account is the `account` search parameter, never component state, so
 * the dashboard's rule-status link and a reload open the same sheet. Changing
 * it replaces the history entry in place: stepping through accounts asks the
 * server for nothing, and Back leaves Settings rather than the sheet.
 */
export function SettingsAccounts({
  active,
  archived,
  instruments,
  programs,
  today,
  timeZone,
  children,
}: {
  active: AccountRowData[];
  archived: ArchivedAccountData[];
  instruments: InstrumentOption[];
  programs: ProgramOption[];
  /** Today in `users.timezone`. */
  today: string;
  timeZone: string;
  /** The sections after Accounts. */
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const param = useSearchParams().get("account");
  const open = useMemo(
    () => resolveAccountParam(param, active, archived),
    [param, active, archived],
  );
  const openId =
    open === null ? null : open.kind === "new" ? "new" : open.account.id;
  // A ref, not state: the editor reports a clean draft right before it asks
  // to open the account it just created, within the same event.
  const dirty = useRef(false);
  const onDirtyChange = useCallback((next: boolean) => {
    dirty.current = next;
  }, []);

  function confirmDiscard() {
    if (!dirty.current) return true;
    if (!window.confirm(DISCARD_ACCOUNT_CHANGES)) return false;
    dirty.current = false;
    return true;
  }

  // The parameter as last written. `useSearchParams` catches up with
  // `replaceState` a render later, so a quick second ↓ must step from here,
  // not from what is on screen.
  const written = useRef(param);
  useEffect(() => {
    written.current = param;
  }, [param]);

  function go(target: AccountTarget) {
    const value = target === null ? null : String(target);
    if (value === written.current || !confirmDiscard()) return;
    written.current = value;
    window.history.replaceState(
      null,
      "",
      `${pathname}${accountSearch(window.location.search, target)}`,
    );
  }

  function step(by: 1 | -1) {
    const from = resolveAccountParam(written.current, active, archived);
    if (from?.kind === "active") go(by === 1 ? from.next.id : from.previous.id);
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <SettingsToc
        accounts={active}
        openId={open?.kind === "archived" ? null : openId}
        onOpen={go}
      />
      <div className="flex min-w-0 flex-col gap-10">
        <h1 className="page-title">Settings</h1>
        <SettingsSection
          id="accounts"
          hint="Practice accounts are kept out of every combined figure. Click a row to edit it."
        >
          {active.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
              No active accounts. Every trade belongs to an account, so add one
              to start logging.
            </p>
          ) : (
            <AccountsTable
              accounts={active}
              openId={open?.kind === "active" ? open.account.id : null}
              onOpen={go}
            />
          )}
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => go("new")}
            className="h-10 w-fit"
          >
            <Plus aria-hidden="true" />
            Add account
          </Button>
          <ArchivedAccountsList
            accounts={archived}
            timeZone={timeZone}
            onOpen={go}
          />
        </SettingsSection>
        {children}
      </div>
      <AccountSheet
        open={open}
        instruments={instruments}
        programs={programs}
        today={today}
        onGo={go}
        onStep={step}
        onDirtyChange={onDirtyChange}
        confirmDiscard={confirmDiscard}
      />
    </div>
  );
}

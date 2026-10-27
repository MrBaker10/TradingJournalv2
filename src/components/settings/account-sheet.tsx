"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ProgramOption } from "@/db/queries/prop-firms";
import type { AccountTarget, OpenAccount } from "@/lib/settings/account-param";
import {
  ActiveAccountActions,
  ArchivedAccountActions,
} from "./account-actions";
import type { InstrumentOption } from "./account-commission-rates";
import { AccountForm } from "./account-form";
import { AccountRuleStatus } from "./account-rule-status";
import { type AccountRowData, PracticeTag } from "./accounts-table";
import type { ArchivedAccountData } from "./archived-accounts-list";

export type OpenSettingsAccount = OpenAccount<
  AccountRowData,
  ArchivedAccountData
>;

/** What the sheet shows, so it keeps showing it while it slides out. */
function viewKey(open: OpenSettingsAccount | null) {
  if (open === null) return null;
  return open.kind === "new" ? "new" : `${open.kind}:${open.account.id}`;
}

// ↑/↓ belong to these while they have focus: a select picks with them, a
// textarea moves the caret, a date input steps its segment.
const KEEPS_ARROWS = 'textarea, select, input[type="date"]';

/**
 * The account editor sheet of Design.md §3.8 (medium). Its header counts the
 * account among the active ones and steps to the previous or next; ↑/↓ do
 * the same. The keys are bound here, on the sheet, because the dialog keeps
 * key events from reaching `window` (Design.md §3.10).
 */
export function AccountSheet({
  open,
  instruments,
  programs,
  today,
  onGo,
  onStep,
  onDirtyChange,
  confirmDiscard,
}: {
  open: OpenSettingsAccount | null;
  instruments: InstrumentOption[];
  programs: ProgramOption[];
  today: string;
  /** Opens another account, the empty editor, or (null) closes the sheet. */
  onGo: (target: AccountTarget) => void;
  /** To the next (1) or previous (-1) active account, wrapping around. */
  onStep: (by: 1 | -1) => void;
  onDirtyChange: (dirty: boolean) => void;
  confirmDiscard: () => boolean;
}) {
  const [view, setView] = useState(open);
  if (open !== null && viewKey(open) !== viewKey(view)) setView(open);
  // Fresh props for the same account (after a save or a move) replace the
  // view without a key change, so the editor keeps its state.
  const shown = open ?? view;

  function onKeyDown(event: React.KeyboardEvent) {
    if (shown?.kind !== "active") return;
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return;
    if (event.target instanceof Element && event.target.closest(KEEPS_ARROWS))
      return;
    event.preventDefault();
    // The editor remounts for the next account and takes the focused field
    // with it; on the sheet itself the focus, and the next key, stay here.
    if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus();
    onStep(event.key === "ArrowDown" ? 1 : -1);
  }

  return (
    <Sheet open={open !== null} onOpenChange={(next) => !next && onGo(null)}>
      <SheetContent size="medium" onKeyDown={onKeyDown} className="p-6">
        {shown && (
          <>
            <div className="flex min-h-10 items-center gap-3 pr-10">
              <SheetTitle className="flex min-w-0 flex-1 items-center gap-2 font-semibold text-lg">
                <span className="truncate">
                  {shown.kind === "new" ? "New account" : shown.account.name}
                </span>
                {shown.kind === "active" && shown.account.isPractice && (
                  <PracticeTag />
                )}
              </SheetTitle>
              {shown.kind === "active" && (
                <div className="flex shrink-0 items-center gap-1 text-muted-foreground text-xs">
                  <span className="mr-1 font-mono tabular-nums">
                    {shown.position} / {shown.total}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-lg"
                    className="size-10 lg:size-8"
                    aria-label="Previous account"
                    aria-keyshortcuts="ArrowUp"
                    onClick={() => onStep(-1)}
                  >
                    <ChevronUp aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-lg"
                    className="size-10 lg:size-8"
                    aria-label="Next account"
                    aria-keyshortcuts="ArrowDown"
                    onClick={() => onStep(1)}
                  >
                    <ChevronDown aria-hidden="true" />
                  </Button>
                </div>
              )}
            </div>
            <SheetDescription className="mt-1">
              {shown.kind === "new"
                ? "Set up a trading account before adding trades."
                : shown.kind === "archived"
                  ? "Archived. Its trades are kept; it is out of the selector."
                  : "Details, commissions and prop firm link save together."}
            </SheetDescription>
            <div className="mt-6 flex flex-col gap-6">
              {shown.kind === "archived" ? (
                <ArchivedAccountActions
                  accountId={shown.account.id}
                  inUse={shown.account.inUse}
                  onDeleted={() => onGo(null)}
                />
              ) : (
                <>
                  {shown.kind === "active" && shown.account.attempt && (
                    <AccountRuleStatus
                      attempt={shown.account.attempt}
                      state={shown.account.ruleState}
                    />
                  )}
                  <AccountForm
                    key={viewKey(shown)}
                    account={
                      shown.kind === "active" ? shown.account : undefined
                    }
                    instruments={instruments}
                    programs={programs}
                    today={today}
                    onSaved={(accountId) => {
                      if (shown.kind === "new") onGo(accountId);
                    }}
                    onDirtyChange={onDirtyChange}
                  />
                  {shown.kind === "active" && (
                    <ActiveAccountActions
                      accountId={shown.account.id}
                      isDefault={shown.account.isDefaultForNewTrades}
                      isFirst={shown.position === 1}
                      isLast={shown.position === shown.total}
                      confirmDiscard={confirmDiscard}
                    />
                  )}
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

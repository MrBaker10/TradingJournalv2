"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { editLedgerEntry, removeLedgerEntry } from "@/actions/ledger";
import type { LedgerAccount, LedgerEntryRow } from "@/db/queries/ledger";
import { type LedgerDraft, useLedgerDraft } from "@/hooks/use-ledger-draft";
import { useTwoClickConfirm } from "@/hooks/use-two-click-confirm";
import { formatCentsPlain } from "@/lib/money";
import { LEDGER_DELETE_FAILED, LEDGER_UPDATE_FAILED } from "@/schemas/ledger";
import {
  LedgerEntryFields,
  runWithToast,
  SaveButton,
} from "./ledger-entry-fields";

interface LedgerEditFormProps {
  entry: LedgerEntryRow;
  /** The user's real, active accounts; practice ones are never offered. */
  accounts: LedgerAccount[];
  onClose: () => void;
}

function draftOf(entry: LedgerEntryRow): LedgerDraft {
  return {
    kind: entry.kind,
    category: entry.category ?? "",
    accountId: entry.accountId === null ? "" : String(entry.accountId),
    entryDate: entry.entryDate,
    amount: formatCentsPlain(entry.amountCents),
    note: entry.note ?? "",
  };
}

/**
 * The active real accounts, plus the account the entry already has when it
 * is no longer one of them, tagged — otherwise saving would silently drop it
 * (Design.md §4.20). An archived real account stays pickable; a practice one
 * shows but cannot be picked, so the user sees why saving it is refused.
 */
function accountOptions(
  accounts: LedgerAccount[],
  entry: LedgerEntryRow,
): (LedgerAccount & { disabled?: boolean })[] {
  if (
    entry.accountId === null ||
    entry.accountName === null ||
    accounts.some((account) => account.id === entry.accountId)
  ) {
    return accounts;
  }
  return entry.accountIsPractice
    ? [
        ...accounts,
        {
          id: entry.accountId,
          name: `${entry.accountName} · Practice`,
          disabled: true,
        },
      ]
    : [
        ...accounts,
        { id: entry.accountId, name: `${entry.accountName} · Archived` },
      ];
}

// Design.md §4.25, "Bearbeiten" and "Löschen": inline under the row. Saving
// replaces the whole entry and closes the form; Delete asks for a second
// click, never a modal.
export function LedgerEditForm({
  entry,
  accounts,
  onClose,
}: LedgerEditFormProps) {
  const { draft, errors, change, validate, formRef } = useLedgerDraft(() =>
    draftOf(entry),
  );
  // Separate, so "Saving…" never shows while a delete runs.
  const [isSaving, startSave] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const isPending = isSaving || isDeleting;
  const deleteConfirm = useTwoClickConfirm();

  function save() {
    if (isPending) return;
    const input = validate();
    if (input === null) return;
    startSave(async () => {
      const saved = await runWithToast(
        () => editLedgerEntry({ ...input, entryId: entry.id }),
        { success: "Entry saved", failed: LEDGER_UPDATE_FAILED },
      );
      if (saved) onClose();
    });
  }

  function handleDeleteClick() {
    if (isPending) return;
    deleteConfirm.press(() =>
      startDelete(async () => {
        const deleted = await runWithToast(
          () => removeLedgerEntry({ entryId: entry.id }),
          { success: "Entry deleted", failed: LEDGER_DELETE_FAILED },
        );
        if (deleted) onClose();
      }),
    );
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="flex flex-col gap-4 rounded-ctl bg-well p-4"
      aria-label="Edit entry"
    >
      <h3 className="cap">Edit entry</h3>
      <LedgerEntryFields
        draft={draft}
        errors={errors}
        onChange={change}
        accounts={accountOptions(accounts, entry)}
        disabled={isPending}
      />
      <div className="flex flex-wrap items-center gap-2">
        <SaveButton pending={isSaving} label="Save changes" />
        <button
          type="button"
          disabled={isPending}
          onClick={onClose}
          className="flex h-11 items-center justify-center rounded-ctl px-4 text-fg-muted text-sm transition-colors hover:text-fg disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={handleDeleteClick}
          className={`ml-auto flex h-11 items-center justify-center gap-1.5 rounded-ctl border px-4 text-sm transition-colors duration-200 disabled:opacity-60 ${
            deleteConfirm.armed
              ? "border-danger-fg/60 bg-danger/15 text-danger-fg"
              : "border-transparent text-danger-fg hover:border-danger-fg/45"
          }`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {deleteConfirm.armed ? "Click again to confirm" : "Delete"}
        </button>
      </div>
    </form>
  );
}

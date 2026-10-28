"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import {
  addLedgerEntry,
  editLedgerEntry,
  removeLedgerEntry,
} from "@/actions/ledger";
import { MetricRow } from "@/components/dashboard/metric-row";
import { DrawnCheck } from "@/components/trades/form-blocks";
import { Button } from "@/components/ui/button";
import { PendingIndicator } from "@/components/ui/pending-indicator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { runWithToast } from "@/components/ui/toast";
import type { LedgerAccount, LedgerEntryRow } from "@/db/queries/ledger";
import { signedLedgerCents } from "@/domain/ledger";
import type { IsoDate } from "@/domain/streak";
import { type LedgerDraft, useLedgerDraft } from "@/hooks/use-ledger-draft";
import { useRetainedTarget } from "@/hooks/use-retained-target";
import { useTwoClickConfirm } from "@/hooks/use-two-click-confirm";
import { moneyTone } from "@/lib/dashboard/sign-tone";
import { formatCents, formatCentsPlain } from "@/lib/money";
import { formatDateWithYear } from "@/lib/time";
import {
  LEDGER_DELETE_FAILED,
  LEDGER_SAVE_FAILED,
  LEDGER_UPDATE_FAILED,
} from "@/schemas/ledger";
import {
  type LedgerAccountOption,
  LedgerEntryFields,
} from "./ledger-entry-fields";
import { ledgerEntryLabel } from "./ledger-labels";

/** What the sheet shows: one entry, or the empty form for a new one. */
export type LedgerSheetTarget =
  | { kind: "entry"; entry: LedgerEntryRow }
  | {
      kind: "new";
    };

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
 * is no longer one of them, tagged, or saving would silently drop it. An
 * archived real account stays pickable; a practice one shows but cannot be
 * picked, so the trader sees why saving it is refused.
 */
function accountOptions(
  accounts: LedgerAccount[],
  entry: LedgerEntryRow | null,
): LedgerAccountOption[] {
  if (
    entry === null ||
    entry.accountId === null ||
    entry.accountName === null ||
    accounts.some((account) => account.id === entry.accountId)
  ) {
    return accounts;
  }
  return [
    ...accounts,
    entry.accountIsPractice
      ? {
          id: entry.accountId,
          name: `${entry.accountName} · Practice`,
          disabled: true,
        }
      : { id: entry.accountId, name: `${entry.accountName} · Archived` },
  ];
}

/** Which state of one target the sheet is in. */
type Mode =
  | { kind: "detail" }
  | { kind: "form" }
  | { kind: "saved"; edited: boolean; draft: LedgerDraft };

/**
 * The ledger's one sheet (Design.md §3.4, §3.10, medium): an entry's detail
 * read from its row, the entry form for a new or an existing entry, and the
 * saved state that confirms the action and offers the next one.
 */
export function LedgerSheet({
  target,
  accounts,
  today,
  onClose,
}: {
  target: LedgerSheetTarget | null;
  accounts: LedgerAccount[];
  today: IsoDate;
  onClose: () => void;
}) {
  const view = useRetainedTarget(target, keyOf);

  return (
    <Sheet open={target !== null} onOpenChange={(next) => !next && onClose()}>
      <SheetContent size="medium" className="p-6">
        {view && (
          <LedgerSheetBody
            key={keyOf(view)}
            target={view}
            accounts={accounts}
            today={today}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function keyOf(target: LedgerSheetTarget): string {
  return target.kind === "new" ? "new" : `entry:${target.entry.id}`;
}

function LedgerSheetBody({
  target,
  accounts,
  today,
  onClose,
}: {
  target: LedgerSheetTarget;
  accounts: LedgerAccount[];
  today: IsoDate;
  onClose: () => void;
}) {
  const entry = target.kind === "entry" ? target.entry : null;
  const [mode, setMode] = useState<Mode>(
    entry ? { kind: "detail" } : { kind: "form" },
  );
  // Each "Add another" starts a fresh form from the last one.
  const [formKey, setFormKey] = useState(0);
  const [nextDraft, setNextDraft] = useState<LedgerDraft | null>(null);

  if (mode.kind === "saved") {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-4 py-16 text-center"
      >
        <SheetTitle className="sr-only">Entry saved</SheetTitle>
        <DrawnCheck />
        <p className="font-semibold text-xl tracking-tight">Entry saved</p>
        <p className="font-mono text-muted-foreground text-sm tabular-nums">
          {formatDateWithYear(mode.draft.entryDate)}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {mode.edited ? (
            <Button
              size="lg"
              className="h-10 px-4"
              onClick={() => setMode({ kind: "detail" })}
            >
              Back to entry
            </Button>
          ) : (
            <Button
              size="lg"
              className="h-10 px-4"
              onClick={() => {
                // A run of monthly entries is quick: kind, category,
                // account and date stay, amount and note clear.
                setNextDraft({ ...mode.draft, amount: "", note: "" });
                setFormKey((key) => key + 1);
                setMode({ kind: "form" });
              }}
            >
              Add another
            </Button>
          )}
          <Button
            size="lg"
            variant="outline"
            className="h-10 px-4"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    );
  }

  if (mode.kind === "form") {
    return (
      <LedgerForm
        key={formKey}
        entry={entry}
        initial={
          nextDraft ??
          (entry
            ? draftOf(entry)
            : {
                kind: "expense",
                category: "",
                accountId: "",
                entryDate: today,
                amount: "",
                note: "",
              })
        }
        accounts={accountOptions(accounts, entry)}
        onCancel={entry ? () => setMode({ kind: "detail" }) : onClose}
        onSaved={(draft) =>
          setMode({ kind: "saved", edited: entry !== null, draft })
        }
      />
    );
  }

  // Detail only exists for an entry.
  if (entry === null) return null;
  return (
    <LedgerDetail
      entry={entry}
      onEdit={() => setMode({ kind: "form" })}
      onDeleted={onClose}
    />
  );
}

function LedgerDetail({
  entry,
  onEdit,
  onDeleted,
}: {
  entry: LedgerEntryRow;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [isDeleting, startDelete] = useTransition();
  const deleteConfirm = useTwoClickConfirm();
  const signed = signedLedgerCents(entry);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex min-h-10 flex-col gap-1 pr-10">
        <SheetTitle className="font-semibold text-lg">
          {ledgerEntryLabel(entry.kind, entry.category)}
        </SheetTitle>
        <SheetDescription className="font-mono tabular-nums">
          {formatDateWithYear(entry.entryDate)}
        </SheetDescription>
      </div>

      <dl className="text-[13px]">
        <MetricRow label="Amount" tone={moneyTone(signed)}>
          {formatCents(signed, { signed: true })}
        </MetricRow>
        <div className="flex items-baseline justify-between gap-4 border-b border-dashed py-1">
          <dt className="text-muted-foreground">Account</dt>
          <dd className="text-right">
            {entry.accountName ?? (
              <span className="text-muted-foreground">No account</span>
            )}
          </dd>
        </div>
      </dl>

      {entry.note && (
        <div className="flex flex-col gap-1">
          <h3 className="font-medium text-muted-foreground text-xs">Note</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {entry.note}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          size="lg"
          variant="outline"
          className="h-10 px-4"
          disabled={isDeleting}
          onClick={onEdit}
        >
          <Pencil aria-hidden="true" />
          Edit
        </Button>
        <Button
          size="lg"
          variant="destructive"
          className="ml-auto h-10 px-4"
          disabled={isDeleting}
          onClick={() =>
            deleteConfirm.press(() =>
              startDelete(async () => {
                const deleted = await runWithToast(
                  () => removeLedgerEntry({ entryId: entry.id }),
                  { success: "Entry deleted", failed: LEDGER_DELETE_FAILED },
                );
                if (deleted) onDeleted();
              }),
            )
          }
        >
          <Trash2 aria-hidden="true" />
          {deleteConfirm.armed ? "Confirm delete" : "Delete"}
        </Button>
      </div>
    </div>
  );
}

function LedgerForm({
  entry,
  initial,
  accounts,
  onCancel,
  onSaved,
}: {
  entry: LedgerEntryRow | null;
  initial: LedgerDraft;
  accounts: LedgerAccountOption[];
  onCancel: () => void;
  onSaved: (draft: LedgerDraft) => void;
}) {
  const { draft, errors, change, validate, formRef } = useLedgerDraft(
    () => initial,
  );
  const [isPending, startTransition] = useTransition();

  function save() {
    if (isPending) return;
    const input = validate();
    if (input === null) return;
    startTransition(async () => {
      const saved = entry
        ? await runWithToast(
            () => editLedgerEntry({ ...input, entryId: entry.id }),
            { failed: LEDGER_UPDATE_FAILED },
          )
        : await runWithToast(() => addLedgerEntry(input), {
            failed: LEDGER_SAVE_FAILED,
          });
      if (saved) onSaved(draft);
    });
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="flex flex-col gap-6"
    >
      <div className="flex min-h-10 flex-col gap-1 pr-10">
        <SheetTitle className="font-semibold text-lg">
          {entry ? "Edit entry" : "New entry"}
        </SheetTitle>
        <SheetDescription>
          Real money around your prop trading, kept apart from trading P&L.
        </SheetDescription>
      </div>
      <LedgerEntryFields
        draft={draft}
        errors={errors}
        onChange={change}
        accounts={accounts}
        disabled={isPending}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="lg"
          className="h-10 min-w-32 px-4"
          disabled={isPending}
        >
          {isPending ? (
            <PendingIndicator label="Saving…" />
          ) : entry ? (
            "Save entry"
          ) : (
            "Add entry"
          )}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="ghost"
          className="h-10 px-4"
          disabled={isPending}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

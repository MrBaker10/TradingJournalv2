"use client";

import { Banknote, Check, Receipt } from "lucide-react";
import { useId } from "react";
import {
  CardChoice,
  Choice,
  FieldError,
  TextField,
} from "@/components/trades/form-blocks";
import { PendingIndicator } from "@/components/ui/pending-indicator";
import { notifyError, notifyProcess } from "@/components/ui/toast";
import type { LedgerAccount } from "@/db/queries/ledger";
import { EXPENSE_CATEGORIES, type LedgerKind } from "@/domain/ledger";
import type { LedgerDraft, LedgerFieldErrors } from "@/hooks/use-ledger-draft";
import { MAX_LEDGER_NOTE_LENGTH } from "@/schemas/ledger";
import { EXPENSE_CATEGORY_LABELS } from "./ledger-labels";

/**
 * Runs a ledger or strategy action and reports it as a toast: the action's
 * own message when it refuses, `failed` when the request itself breaks, and
 * `success` when given — a form with its own saved state leaves it out.
 * Resolves to whether it succeeded, so the form decides what follows.
 */
export async function runWithToast(
  action: () => Promise<{ success: true } | { success: false; error: string }>,
  messages: { success?: string; failed: string },
): Promise<boolean> {
  try {
    const result = await action();
    if (!result.success) {
      notifyError(result.error);
      return false;
    }
    if (messages.success) notifyProcess(messages.success);
    return true;
  } catch {
    notifyError(messages.failed);
    return false;
  }
}

/**
 * The strategies page's primary button, in the old tokens until its own
 * redesign ticket (12).
 */
export function SaveButton({
  pending,
  label,
}: {
  pending: boolean;
  label: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-11 min-w-36 items-center justify-center gap-2 rounded-ctl bg-[image:var(--gradient-info-soft)] px-4 font-medium text-fg text-sm shadow-[var(--shadow-info-soft)] transition-colors hover:bg-white/5 focus-visible:outline-cyan disabled:opacity-40"
    >
      {pending ? (
        <PendingIndicator label="Saving…" />
      ) : (
        <>
          <Check className="h-4 w-4 text-cyan" aria-hidden="true" />
          {label}
        </>
      )}
    </button>
  );
}

/** An account the form offers; `disabled` shows it without letting it be picked. */
export type LedgerAccountOption = LedgerAccount & { disabled?: boolean };

const KIND_OPTIONS = [
  {
    value: "expense",
    title: "Expense",
    hint: "Evaluation, reset, activation, subscription, data",
    icon: <Receipt className="size-4" aria-hidden="true" />,
  },
  {
    value: "payout",
    title: "Payout",
    hint: "Money a firm paid out to you",
    icon: <Banknote className="size-4" aria-hidden="true" />,
  },
] as const satisfies readonly {
  value: LedgerKind;
  title: string;
  hint: string;
  icon: React.ReactNode;
}[];

/**
 * The ledger entry's fields as the form blocks of Design.md §3.5, on one page:
 * the kind as two cards, category and account as loose choices, then date,
 * amount and note. The draft and its check live in `useLedgerDraft`; every
 * error sits at its field.
 */
export function LedgerEntryFields({
  draft,
  errors,
  onChange,
  accounts,
  disabled,
}: {
  draft: LedgerDraft;
  errors: LedgerFieldErrors;
  onChange: (values: Partial<LedgerDraft>) => void;
  /** What the account choice offers; none picked is "No account". */
  accounts: LedgerAccountOption[];
  disabled: boolean;
}) {
  const id = useId();
  const accountIds = accounts.map((account) => String(account.id));
  const accountName = (accountId: string) =>
    accounts.find((account) => String(account.id) === accountId)?.name ??
    accountId;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <CardChoice
        label="Kind"
        options={KIND_OPTIONS}
        value={draft.kind}
        onChange={(kind) => onChange({ kind })}
        disabled={disabled}
      />

      {draft.kind === "expense" && (
        <div className="flex flex-col gap-1">
          <Choice
            label="Category"
            options={EXPENSE_CATEGORIES}
            value={draft.category}
            onChange={(category) => onChange({ category })}
            invalid={Boolean(errors.category)}
            disabled={disabled}
            render={(category) => EXPENSE_CATEGORY_LABELS[category]}
          />
          <FieldError message={errors.category} />
        </div>
      )}

      {accounts.length > 0 && (
        <div className="flex flex-col gap-1">
          <Choice
            label="Account"
            options={accountIds}
            value={draft.accountId}
            onChange={(accountId) => onChange({ accountId })}
            invalid={Boolean(errors.accountId)}
            disabled={disabled}
            // A practice account the entry already has can be cleared, never
            // picked again.
            isOptionDisabled={(accountId) =>
              accountId !== draft.accountId &&
              accounts.some(
                (account) =>
                  String(account.id) === accountId && account.disabled,
              )
            }
            render={accountName}
          />
          <FieldError message={errors.accountId} />
          {!errors.accountId && (
            <p className="text-muted-foreground text-xs">
              None picked is no account: costs no account owns, like a data
              feed.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id={`${id}-date`}
          label="Date"
          type="date"
          numeric
          required
          value={draft.entryDate}
          onChange={(entryDate) => onChange({ entryDate })}
          error={errors.entryDate}
          disabled={disabled}
        />
        <TextField
          id={`${id}-amount`}
          label="Amount (USD)"
          numeric
          required
          value={draft.amount}
          onChange={(amount) => onChange({ amount })}
          placeholder="0.00"
          hint="0 is fine — a free reset still counts."
          error={errors.amount}
          disabled={disabled}
        />
      </div>

      <TextField
        id={`${id}-note`}
        label="Note (optional)"
        value={draft.note}
        onChange={(note) => onChange({ note })}
        placeholder="e.g. 50k evaluation, monthly data feed"
        maxLength={MAX_LEDGER_NOTE_LENGTH}
        error={errors.note}
        disabled={disabled}
      />
    </div>
  );
}

"use client";

import { Check } from "lucide-react";
import { useId } from "react";
import { FIELD_CLASS } from "@/components/ui/field-class";
import { PendingIndicator } from "@/components/ui/pending-indicator";
import { notifyError, notifyProcess } from "@/components/ui/toast";
import type { LedgerAccount } from "@/db/queries/ledger";
import {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  LEDGER_KINDS,
} from "@/domain/ledger";
import type { LedgerDraft, LedgerFieldErrors } from "@/hooks/use-ledger-draft";
import { MAX_LEDGER_NOTE_LENGTH } from "@/schemas/ledger";
import { EXPENSE_CATEGORY_LABELS, LEDGER_KIND_LABELS } from "./ledger-labels";

// What the add and the edit form share besides the draft
// (src/hooks/use-ledger-draft.ts): the fields, the primary button and how an
// action is reported. Each form decides what saving means and what follows.

/**
 * Runs a ledger action and reports it as a toast: the action's own message
 * when it refuses, `failed` when the request itself breaks. Resolves to
 * whether it succeeded, so the form decides what follows.
 */
export async function runWithToast(
  action: () => Promise<{ success: true } | { success: false; error: string }>,
  messages: { success: string; failed: string },
): Promise<boolean> {
  try {
    const result = await action();
    if (!result.success) {
      notifyError(result.error);
      return false;
    }
    notifyProcess(messages.success);
    return true;
  } catch {
    notifyError(messages.failed);
    return false;
  }
}

/** The primary button of 4.2, for adding and for saving an edit alike. */
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

interface LedgerEntryFieldsProps {
  draft: LedgerDraft;
  errors: LedgerFieldErrors;
  onChange: (values: Partial<LedgerDraft>) => void;
  /** What the account select offers after "No account". */
  accounts: (LedgerAccount & { disabled?: boolean })[];
  disabled: boolean;
}

export function LedgerEntryFields({
  draft,
  errors,
  onChange,
  accounts,
  disabled,
}: LedgerEntryFieldsProps) {
  // Add and edit forms share the page, so every id is per form.
  const id = useId();
  return (
    <fieldset
      disabled={disabled}
      className="flex min-w-0 flex-col gap-4 disabled:opacity-60"
    >
      {/* Native radios under the chip look of the filters, so arrow keys
          and screen readers treat the two kinds as one choice. */}
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-fg text-sm">Kind</legend>
        <div className="flex flex-wrap gap-1.5">
          {LEDGER_KINDS.map((kind) => (
            <label
              key={kind}
              className={`cursor-pointer rounded-xs border px-2.5 py-1.5 text-sm transition-colors duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-cyan ${
                draft.kind === kind
                  ? "border-cyan/50 bg-cyan-dim text-cyan"
                  : "border-white/12 bg-well text-fg-muted hover:border-cyan/35"
              }`}
            >
              <input
                type="radio"
                name={`${id}-kind`}
                value={kind}
                checked={draft.kind === kind}
                onChange={() => onChange({ kind })}
                className="sr-only"
              />
              {LEDGER_KIND_LABELS[kind]}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Design.md §4.25: Category and Account side by side from `sm`
          (a payout has Account alone), then Date and Amount. */}
      <div className="grid gap-4 sm:grid-cols-2">
        {draft.kind === "expense" ? (
          <div>
            <label
              htmlFor={`${id}-category`}
              className="mb-2 block text-fg text-sm"
            >
              Category
            </label>
            <select
              id={`${id}-category`}
              value={draft.category}
              onChange={(event) =>
                onChange({
                  category: event.target.value as ExpenseCategory | "",
                })
              }
              className={FIELD_CLASS}
              aria-invalid={!!errors.category}
              aria-describedby={`${id}-category-error`}
            >
              <option value="">Pick a category</option>
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {EXPENSE_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
            <p
              id={`${id}-category-error`}
              className="mt-1 min-h-[18px] text-danger-fg text-xs"
            >
              {errors.category}
            </p>
          </div>
        ) : null}
        <div>
          <label
            htmlFor={`${id}-account`}
            className="mb-2 block text-fg text-sm"
          >
            Account
          </label>
          <select
            id={`${id}-account`}
            value={draft.accountId}
            onChange={(event) => onChange({ accountId: event.target.value })}
            className={FIELD_CLASS}
            aria-invalid={!!errors.accountId}
            aria-describedby={`${id}-account-error ${id}-account-help`}
          >
            <option value="">No account</option>
            {accounts.map((account) => (
              <option
                key={account.id}
                value={account.id}
                disabled={account.disabled}
              >
                {account.name}
              </option>
            ))}
          </select>
          <p
            id={`${id}-account-error`}
            className="mt-1 min-h-[18px] text-danger-fg text-xs"
          >
            {errors.accountId}
          </p>
          <p
            id={`${id}-account-help`}
            className="text-fg-subtle text-xs leading-relaxed"
          >
            Leave empty for costs no account owns, like a data feed.
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-date`} className="mb-2 block text-fg text-sm">
            Date
          </label>
          <input
            id={`${id}-date`}
            type="date"
            value={draft.entryDate}
            onChange={(event) => onChange({ entryDate: event.target.value })}
            className={`${FIELD_CLASS} font-mono tabular-nums`}
            aria-invalid={!!errors.entryDate}
            aria-describedby={`${id}-date-error`}
          />
          <p
            id={`${id}-date-error`}
            className="mt-1 min-h-[18px] text-danger-fg text-xs"
          >
            {errors.entryDate}
          </p>
        </div>
        <div>
          <label
            htmlFor={`${id}-amount`}
            className="mb-2 block text-fg text-sm"
          >
            Amount <span className="text-fg-subtle">(USD)</span>
          </label>
          <input
            id={`${id}-amount`}
            inputMode="decimal"
            autoComplete="off"
            value={draft.amount}
            onChange={(event) => onChange({ amount: event.target.value })}
            placeholder="0.00"
            className={`${FIELD_CLASS} font-mono tabular-nums`}
            aria-invalid={!!errors.amount}
            aria-describedby={`${id}-amount-error ${id}-amount-help`}
          />
          <p
            id={`${id}-amount-error`}
            className="mt-1 min-h-[18px] text-danger-fg text-xs"
          >
            {errors.amount}
          </p>
          <p
            id={`${id}-amount-help`}
            className="text-fg-subtle text-xs leading-relaxed"
          >
            0 is fine — a free reset still counts.
          </p>
        </div>
      </div>

      <div>
        <label htmlFor={`${id}-note`} className="mb-2 block text-fg text-sm">
          Note <span className="text-fg-subtle">(optional)</span>
        </label>
        <input
          id={`${id}-note`}
          autoComplete="off"
          maxLength={MAX_LEDGER_NOTE_LENGTH}
          value={draft.note}
          onChange={(event) => onChange({ note: event.target.value })}
          placeholder="e.g. 50k evaluation, monthly data feed"
          className={FIELD_CLASS}
          aria-invalid={!!errors.note}
          aria-describedby={`${id}-note-error`}
        />
        <p
          id={`${id}-note-error`}
          className="mt-1 min-h-[18px] text-danger-fg text-xs"
        >
          {errors.note}
        </p>
      </div>
    </fieldset>
  );
}

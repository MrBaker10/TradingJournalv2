"use client";

import { Check } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { addLedgerEntry } from "@/actions/ledger";
import { FIELD_CLASS } from "@/components/ui/field-class";
import { PendingIndicator } from "@/components/ui/pending-indicator";
import type { LedgerAccount } from "@/db/queries/ledger";
import {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  LEDGER_KINDS,
  type LedgerKind,
} from "@/domain/ledger";
import type { IsoDate } from "@/domain/streak";
import {
  type CreateLedgerEntryInput,
  createLedgerEntrySchema,
  LEDGER_SAVE_FAILED,
  MAX_LEDGER_NOTE_LENGTH,
} from "@/schemas/ledger";
import { EXPENSE_CATEGORY_LABELS, LEDGER_KIND_LABELS } from "./ledger-labels";

interface LedgerEntryFormProps {
  /** Today in the user's timezone, the date a new entry starts with. */
  today: IsoDate;
  /** The user's real, active accounts; practice ones are never offered. */
  accounts: LedgerAccount[];
}

interface Draft {
  kind: LedgerKind;
  category: ExpenseCategory | "";
  /** An account id as the select holds it; "" is no account. */
  accountId: string;
  entryDate: string;
  amount: string;
  note: string;
}

// Design.md §4.25. Saving is explicit; afterwards amount and note clear while
// kind, category, account and date stay, so a run of monthly entries is quick
// to add.
export function LedgerEntryForm({ today, accounts }: LedgerEntryFormProps) {
  const [draft, setDraft] = useState<Draft>({
    kind: "expense",
    category: "",
    accountId: "",
    entryDate: today,
    amount: "",
    note: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function change(values: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...values }));
    setErrors({});
  }

  function save() {
    if (isPending) return;
    const input: CreateLedgerEntryInput = {
      kind: draft.kind,
      category:
        draft.kind === "expense" && draft.category !== ""
          ? draft.category
          : null,
      accountId: draft.accountId === "" ? null : Number(draft.accountId),
      entryDate: draft.entryDate,
      amount: draft.amount.trim() === "" ? Number.NaN : Number(draft.amount),
      note: draft.note,
    };
    const parsed = createLedgerEntrySchema.safeParse(input);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues)
        next[issue.path.join(".")] ??= issue.message;
      setErrors(next);
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    startTransition(async () => {
      try {
        // The input, not `parsed.data`: the schema turns an empty note into
        // null, and the action parses again.
        const result = await addLedgerEntry(input);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("Entry added");
        setDraft((current) => ({ ...current, amount: "", note: "" }));
      } catch {
        toast.error(LEDGER_SAVE_FAILED);
      }
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
      className="card-surface edge flex flex-col gap-4 p-5"
    >
      <h2 className="cap">Add entry</h2>
      <fieldset
        disabled={isPending}
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
                  name="ledger-kind"
                  value={kind}
                  checked={draft.kind === kind}
                  onChange={() => change({ kind })}
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
                htmlFor="ledger-category"
                className="mb-2 block text-fg text-sm"
              >
                Category
              </label>
              <select
                id="ledger-category"
                value={draft.category}
                onChange={(event) =>
                  change({
                    category: event.target.value as ExpenseCategory | "",
                  })
                }
                className={FIELD_CLASS}
                aria-invalid={!!errors.category}
                aria-describedby="ledger-category-error"
              >
                <option value="">Pick a category</option>
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {EXPENSE_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
              <p
                id="ledger-category-error"
                className="mt-1 min-h-[18px] text-danger-fg text-xs"
              >
                {errors.category}
              </p>
            </div>
          ) : null}
          <div>
            <label
              htmlFor="ledger-account"
              className="mb-2 block text-fg text-sm"
            >
              Account
            </label>
            <select
              id="ledger-account"
              value={draft.accountId}
              onChange={(event) => change({ accountId: event.target.value })}
              className={FIELD_CLASS}
              aria-invalid={!!errors.accountId}
              aria-describedby="ledger-account-error ledger-account-help"
            >
              <option value="">No account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            <p
              id="ledger-account-error"
              className="mt-1 min-h-[18px] text-danger-fg text-xs"
            >
              {errors.accountId}
            </p>
            <p
              id="ledger-account-help"
              className="text-fg-subtle text-xs leading-relaxed"
            >
              Leave empty for costs no account owns, like a data feed.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ledger-date" className="mb-2 block text-fg text-sm">
              Date
            </label>
            <input
              id="ledger-date"
              type="date"
              value={draft.entryDate}
              onChange={(event) => change({ entryDate: event.target.value })}
              className={`${FIELD_CLASS} font-mono tabular-nums`}
              aria-invalid={!!errors.entryDate}
              aria-describedby="ledger-date-error"
            />
            <p
              id="ledger-date-error"
              className="mt-1 min-h-[18px] text-danger-fg text-xs"
            >
              {errors.entryDate}
            </p>
          </div>
          <div>
            <label
              htmlFor="ledger-amount"
              className="mb-2 block text-fg text-sm"
            >
              Amount <span className="text-fg-subtle">(USD)</span>
            </label>
            <input
              id="ledger-amount"
              inputMode="decimal"
              autoComplete="off"
              value={draft.amount}
              onChange={(event) => change({ amount: event.target.value })}
              placeholder="0.00"
              className={`${FIELD_CLASS} font-mono tabular-nums`}
              aria-invalid={!!errors.amount}
              aria-describedby="ledger-amount-error ledger-amount-help"
            />
            <p
              id="ledger-amount-error"
              className="mt-1 min-h-[18px] text-danger-fg text-xs"
            >
              {errors.amount}
            </p>
            <p
              id="ledger-amount-help"
              className="text-fg-subtle text-xs leading-relaxed"
            >
              0 is fine — a free reset still counts.
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="ledger-note" className="mb-2 block text-fg text-sm">
            Note <span className="text-fg-subtle">(optional)</span>
          </label>
          <input
            id="ledger-note"
            autoComplete="off"
            maxLength={MAX_LEDGER_NOTE_LENGTH}
            value={draft.note}
            onChange={(event) => change({ note: event.target.value })}
            placeholder="e.g. 50k evaluation, monthly data feed"
            className={FIELD_CLASS}
            aria-invalid={!!errors.note}
            aria-describedby="ledger-note-error"
          />
          <p
            id="ledger-note-error"
            className="mt-1 min-h-[18px] text-danger-fg text-xs"
          >
            {errors.note}
          </p>
        </div>
      </fieldset>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="flex h-11 min-w-36 items-center justify-center gap-2 rounded-ctl bg-[image:var(--gradient-info-soft)] px-4 font-medium text-fg text-sm shadow-[var(--shadow-info-soft)] transition-colors hover:bg-white/5 focus-visible:outline-cyan disabled:opacity-40"
        >
          {isPending ? (
            <PendingIndicator label="Saving…" />
          ) : (
            <>
              <Check className="h-4 w-4 text-cyan" aria-hidden="true" />
              Add entry
            </>
          )}
        </button>
      </div>
    </form>
  );
}

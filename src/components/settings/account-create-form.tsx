"use client";

import { Check, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { createAccount, updateAccount } from "@/actions/accounts";
import { FIELD_CLASS } from "@/components/ui/field-class";
import { PendingIndicator } from "@/components/ui/pending-indicator";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { ACCOUNT_CURRENCIES, type AccountCurrency } from "@/domain/fx";
import { useUnsavedAccount } from "@/hooks/use-unsaved-account";
import { formatCentsPlain } from "@/lib/money";
import { createAccountSchema } from "@/schemas/accounts";
import {
  AccountCommissionRates,
  type CommissionDraft,
  type InstrumentOption,
} from "./account-commission-rates";
import type { AccountRowData } from "./account-row";

interface AccountFormProps {
  account?: AccountRowData;
  instruments: InstrumentOption[];
  onClose: () => void;
  onSaved: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onPendingChange: (pending: boolean) => void;
}

function initialDraft(account?: AccountRowData) {
  return {
    name: account?.name ?? "",
    currency: account?.currency ?? ("USD" as AccountCurrency),
    isPractice: account?.isPractice ?? false,
    startingBalance:
      account?.startingBalance === "0.00"
        ? ""
        : (account?.startingBalance ?? ""),
    rates: (account?.commissionRates ?? []).map(
      (rate): CommissionDraft => ({
        key: String(rate.instrumentId),
        instrumentId: String(rate.instrumentId),
        perSide: formatCentsPlain(rate.perSideCents),
      }),
    ),
  };
}

export function AccountForm({
  account,
  instruments,
  onClose,
  onSaved,
  onDirtyChange,
  onPendingChange,
}: AccountFormProps) {
  const [initial] = useState(() => initialDraft(account));
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const dirty = JSON.stringify(initial) !== JSON.stringify(draft);
  useUnsavedAccount(dirty, isPending);

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => onPendingChange(isPending), [isPending, onPendingChange]);
  useEffect(() => {
    formRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, []);

  function change(values: Partial<typeof draft>) {
    setDraft((current) => ({ ...current, ...values }));
    setErrors({});
  }

  function save() {
    if (isPending) return;
    const parsed = createAccountSchema.safeParse({
      name: draft.name,
      currency: draft.currency,
      isPractice: draft.isPractice,
      startingBalance:
        draft.startingBalance.trim() === ""
          ? undefined
          : Number(draft.startingBalance),
      commissionRates: draft.rates.map((rate) => ({
        instrumentId: Number(rate.instrumentId),
        perSide: rate.perSide.trim() === "" ? undefined : Number(rate.perSide),
      })),
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues)
        next[issue.path.join(".")] ??= issue.message;
      setErrors(next);
      const details = formRef.current?.querySelector("details");
      if (
        details &&
        Object.keys(next).some((key) => key.startsWith("commissionRates"))
      )
        details.open = true;
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    startTransition(async () => {
      try {
        const result = account
          ? await updateAccount({ ...parsed.data, accountId: account.id })
          : await createAccount(parsed.data);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(account ? "Account saved" : "Account created");
        onDirtyChange(false);
        onPendingChange(false);
        onSaved();
      } catch {
        toast.error(
          "Couldn't confirm the save. Your changes are still here — check your connection and try again.",
        );
      }
    });
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(event) => event.preventDefault()}
      className="border-t border-white/8 p-5 sm:p-6"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-medium text-fg">
            {account ? "Edit account" : "New account"}
          </h3>
          <p className="mt-1 text-sm text-fg-muted">
            {account
              ? "Review your changes, then save them together."
              : "Set up your trading account before adding trades."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          aria-label="Close account form"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-ctl text-fg-muted hover:bg-white/5 hover:text-fg focus-visible:outline-cyan disabled:opacity-40"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <fieldset
        disabled={isPending}
        className="flex min-w-0 flex-col gap-5 disabled:opacity-60"
      >
        <div>
          <label htmlFor="account-name" className="mb-2 block text-sm text-fg">
            Account name <span className="text-fg-subtle">*</span>
          </label>
          <input
            id="account-name"
            required
            maxLength={100}
            autoComplete="off"
            value={draft.name}
            onChange={(event) => change({ name: event.target.value })}
            placeholder="e.g. Live, Evaluation, Backtesting"
            className={FIELD_CLASS}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "account-name-error" : undefined}
          />
          <p id="account-name-error" className="mt-1 text-xs text-danger-fg">
            {errors.name}
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="account-currency"
              className="mb-2 block text-sm text-fg"
            >
              Currency
            </label>
            <select
              id="account-currency"
              value={draft.currency}
              onChange={(event) =>
                change({ currency: event.target.value as AccountCurrency })
              }
              disabled={account?.hasTrades || isPending}
              className={FIELD_CLASS}
              aria-describedby="account-currency-help"
            >
              {ACCOUNT_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
            <p
              id="account-currency-help"
              className="mt-2 text-xs leading-relaxed text-fg-subtle"
            >
              {account?.hasTrades
                ? "Locked — this account has trades"
                : "Your broker's account currency. Fixed once trades are assigned."}
            </p>
          </div>
          <div>
            <label
              htmlFor="account-balance"
              className="mb-2 block text-sm text-fg"
            >
              Starting balance{" "}
              <span className="text-fg-subtle">({draft.currency})</span>
            </label>
            <input
              id="account-balance"
              inputMode="decimal"
              value={draft.startingBalance}
              onChange={(event) =>
                change({ startingBalance: event.target.value })
              }
              placeholder="0.00"
              className={`${FIELD_CLASS} font-mono tabular-nums`}
              aria-invalid={!!errors.startingBalance}
              aria-describedby="account-balance-help account-balance-error"
            />
            <p
              id="account-balance-error"
              className="mt-1 text-xs text-danger-fg"
            >
              {errors.startingBalance}
            </p>
            <p
              id="account-balance-help"
              className="mt-2 text-xs leading-relaxed text-fg-subtle"
            >
              Optional. Your equity curve starts here.
            </p>
          </div>
        </div>
        <div
          className={`flex items-start justify-between gap-5 rounded-ctl border p-4 ${draft.isPractice ? "border-practice/40 bg-practice-dim" : "border-white/8 bg-well"}`}
        >
          <div>
            <span className="text-sm font-medium text-fg">
              Practice account
            </span>
            <p className="mt-1 max-w-lg text-xs leading-relaxed text-fg-muted">
              Excluded from combined figures and progress. View its numbers by
              selecting this account.
            </p>
          </div>
          <ToggleSwitch
            checked={draft.isPractice}
            onCheckedChange={(isPractice) => change({ isPractice })}
            disabled={isPending}
            ariaLabel="Practice account"
          />
        </div>
        <AccountCommissionRates
          rates={draft.rates}
          instruments={instruments}
          onChange={(rates) => change({ rates })}
          errors={errors}
        />
      </fieldset>
      <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-white/8 pt-5">
        <span role="status" className="mr-auto text-xs text-fg-muted">
          {dirty ? "Unsaved changes" : account ? "No changes" : "* Required"}
        </span>
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="h-11 rounded-ctl px-4 text-sm text-fg-muted transition-colors hover:bg-white/5 hover:text-fg focus-visible:outline-cyan disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={isPending || (!!account && !dirty)}
          className="flex h-11 min-w-36 items-center justify-center gap-2 rounded-ctl bg-[image:var(--gradient-info-soft)] px-4 text-sm font-medium text-fg shadow-[var(--shadow-info-soft)] transition-colors hover:bg-white/5 focus-visible:outline-cyan disabled:opacity-40"
        >
          {isPending ? (
            <PendingIndicator label="Saving…" />
          ) : (
            <>
              <Check className="h-4 w-4 text-cyan" aria-hidden="true" />
              {account ? "Save account" : "Create account"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

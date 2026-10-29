"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { createAccount, updateAccount } from "@/actions/accounts";
import { TermInfo } from "@/components/terms/term-info";
import { FieldError, FieldLabel } from "@/components/trades/form-blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PendingIndicator } from "@/components/ui/pending-indicator";
import { Switch } from "@/components/ui/switch";
import { notifyError, notifyProcess } from "@/components/ui/toast";
import type { ProgramOption } from "@/db/queries/prop-firms";
import { ACCOUNT_RULES_MESSAGES } from "@/domain/account-rules";
import { ACCOUNT_CURRENCIES, type AccountCurrency } from "@/domain/fx";
import { useMessage } from "@/hooks/use-message";
import { useUnsavedAccount } from "@/hooks/use-unsaved-account";
import { formatCentsPlain } from "@/lib/money";
import { parseDecimalInput } from "@/lib/numbers";
import { cn } from "@/lib/utils";
import { createAccountSchema } from "@/schemas/accounts";
import {
  AccountCommissionRates,
  type CommissionDraft,
  type InstrumentOption,
} from "./account-commission-rates";
import {
  AccountProgramLink,
  initialLinkDraft,
  linkInput,
} from "./account-program-link";
import type { AccountRowData } from "./accounts-table";
import { HELP_TEXT, PART_HEADING, SELECT_CLASS } from "./fields";

/** How long the button shows "Saved" before it returns (Design.md §3.11). */
const SAVED_HOLD_MS = 1500;

interface AccountFormProps {
  account?: AccountRowData;
  instruments: InstrumentOption[];
  programs: ProgramOption[];
  /** Today in `users.timezone`, the default evaluation start. */
  today: string;
  /** After a save; a new account hands over its id so the sheet can open it. */
  onSaved: (accountId: number) => void;
  onDirtyChange: (dirty: boolean) => void;
}

/** Ledger money belongs to real accounts only: one with entries can't become
 * practice (docs/adr/0002). */
function isPracticeLocked(account?: AccountRowData) {
  return !!account?.hasLedgerEntries && !account.isPractice;
}

function initialDraft(today: string, account?: AccountRowData) {
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
    link: initialLinkDraft(account?.rules, today),
  };
}

/**
 * The account editor of Design.md §3.8: details, commissions and the prop
 * firm link stacked, saved together by one button through the existing
 * create/update actions. Field errors land at the field; a failed save is a
 * toast that keeps the draft.
 */
export function AccountForm({
  account,
  instruments,
  programs,
  today,
  onSaved,
  onDirtyChange,
}: AccountFormProps) {
  const [initial, setInitial] = useState(() => initialDraft(today, account));
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const message = useMessage();
  const formRef = useRef<HTMLFormElement>(null);
  const dirty = JSON.stringify(initial) !== JSON.stringify(draft);
  useUnsavedAccount(dirty, isPending);

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), SAVED_HOLD_MS);
    return () => clearTimeout(timer);
  }, [saved]);

  function change(values: Partial<typeof draft>) {
    setDraft((current) => ({ ...current, ...values }));
    setErrors({});
    setSaved(false);
  }

  const linked = draft.link.programId !== "";
  // A practice account carries no link; the server refuses it either way.
  const practiceLocked = isPracticeLocked(account) || linked;

  function save() {
    if (isPending) return;
    const startingBalance = parseDecimalInput(draft.startingBalance);
    const parsed = createAccountSchema.safeParse({
      name: draft.name,
      currency: draft.currency,
      isPractice: draft.isPractice,
      startingBalance,
      commissionRates: draft.rates.map((rate) => ({
        instrumentId: Number(rate.instrumentId),
        perSide: parseDecimalInput(rate.perSide),
      })),
      rules: linkInput(draft.link),
    });
    const next: Record<string, string> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        next[issue.path.join(".")] ??= message(issue.message);
    }
    if (linked && !((startingBalance ?? 0) > 0))
      next.startingBalance ??= message(ACCOUNT_RULES_MESSAGES.startingBalance);
    if (!parsed.success || Object.keys(next).length) {
      setErrors(next);
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    const data = parsed.data;
    startTransition(async () => {
      try {
        const result = account
          ? await updateAccount({ ...data, accountId: account.id })
          : await createAccount(data);
        if (!result.success) {
          notifyError(message(result.error, result.values));
          return;
        }
        notifyProcess(account ? "Account saved" : "Account created");
        // The draft is what was saved: it becomes the new baseline, so the
        // sheet stays open on a clean editor.
        setInitial(draft);
        setSaved(true);
        onDirtyChange(false);
        onSaved(result.data.id);
      } catch {
        notifyError(
          "Couldn't confirm the save. Your changes are still here — check your connection and try again.",
        );
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
      className="flex flex-col gap-6"
    >
      <fieldset
        disabled={isPending}
        className="flex min-w-0 flex-col gap-6 disabled:opacity-60"
      >
        <section
          aria-labelledby="account-details"
          className="flex flex-col gap-4"
        >
          <h3 id="account-details" className={PART_HEADING}>
            Details
          </h3>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="account-name" required>
              Account name
            </FieldLabel>
            <Input
              id="account-name"
              required
              maxLength={100}
              autoComplete="off"
              value={draft.name}
              onChange={(event) => change({ name: event.target.value })}
              placeholder="e.g. Live, Evaluation, Backtesting"
              className="h-10"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? "account-name-error" : undefined}
            />
            <FieldError id="account-name-error" message={errors.name} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="account-currency">Currency</FieldLabel>
              <select
                id="account-currency"
                value={draft.currency}
                onChange={(event) =>
                  change({ currency: event.target.value as AccountCurrency })
                }
                disabled={account?.hasTrades || isPending}
                className={SELECT_CLASS}
                aria-describedby="account-currency-help"
              >
                {ACCOUNT_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
              <p id="account-currency-help" className={HELP_TEXT}>
                {account?.hasTrades
                  ? "Locked — this account has trades"
                  : "Your broker's account currency. Fixed once trades are assigned."}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="account-balance">
                Starting balance ({draft.currency})
              </FieldLabel>
              <Input
                id="account-balance"
                inputMode="decimal"
                value={draft.startingBalance}
                onChange={(event) =>
                  change({ startingBalance: event.target.value })
                }
                placeholder="0.00"
                className="h-10 font-mono tabular-nums"
                aria-invalid={errors.startingBalance ? true : undefined}
                aria-describedby="account-balance-help account-balance-error"
              />
              <FieldError
                id="account-balance-error"
                message={errors.startingBalance}
              />
              <p id="account-balance-help" className={HELP_TEXT}>
                Optional. Your equity curve starts here.
              </p>
            </div>
          </div>
          <div
            className={`flex items-start justify-between gap-5 rounded-lg border p-4 ${
              draft.isPractice
                ? "border-practice/40 shadow-[inset_2px_0_0_0_var(--color-practice)]"
                : ""
            }`}
          >
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm">Practice account</span>
                <TermInfo term="practiceAccount" />
              </div>
              <p id="account-practice-help" className={`mt-1 ${HELP_TEXT}`}>
                Excluded from combined figures and progress. View its numbers by
                selecting this account.
              </p>
              {practiceLocked && (
                <p id="account-practice-lock" className={`mt-2 ${HELP_TEXT}`}>
                  {isPracticeLocked(account)
                    ? "Locked — this account has ledger entries"
                    : "Locked — linked to a prop firm program"}
                </p>
              )}
            </div>
            {/* "On" is the practice amber; the taller hit area keeps the
                40 px touch target (Design.md §5). */}
            <Switch
              checked={draft.isPractice}
              onCheckedChange={(isPractice) => change({ isPractice })}
              disabled={practiceLocked || isPending}
              aria-label="Practice account"
              aria-describedby={
                practiceLocked
                  ? "account-practice-help account-practice-lock"
                  : "account-practice-help"
              }
              className="mt-0.5 after:-inset-y-3 data-checked:bg-practice"
            />
          </div>
        </section>
        <AccountCommissionRates
          rates={draft.rates}
          instruments={instruments}
          onChange={(rates) => change({ rates })}
          errors={errors}
        />
        <AccountProgramLink
          link={draft.link}
          programs={programs}
          isPractice={draft.isPractice}
          onChange={(link) => change({ link })}
          errors={errors}
        />
      </fieldset>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
        <span role="status" className="mr-auto text-muted-foreground text-xs">
          {dirty ? "Unsaved changes" : account ? "No changes" : "* Required"}
        </span>
        <Button
          type="submit"
          size="lg"
          disabled={isPending || saved || (!!account && !dirty)}
          // Pending and saved are states of the button, not "unavailable".
          className={cn(
            "h-10 min-w-36",
            (isPending || saved) && "disabled:opacity-100",
          )}
        >
          {isPending ? (
            <PendingIndicator label="Saving…" />
          ) : saved ? (
            <>
              <Check aria-hidden="true" />
              Saved
            </>
          ) : account ? (
            "Save account"
          ) : (
            "Create account"
          )}
        </Button>
      </div>
    </form>
  );
}

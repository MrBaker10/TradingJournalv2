"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { useState, useTransition } from "react";
import { createAccount } from "@/actions/accounts";
import { InlineMessage } from "@/components/ui/inline-message";
import { PendingIndicator } from "@/components/ui/pending-indicator";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { ACCOUNT_CURRENCIES, type AccountCurrency } from "@/domain/fx";
import { createAccountSchema } from "@/schemas/accounts";

const SUCCESS_HOLD_MS = 800;

interface AccountCreateFormProps {
  onCreated?: () => void;
}

export function AccountCreateForm({ onCreated }: AccountCreateFormProps) {
  const [name, setName] = useState("");
  const [isPractice, setIsPractice] = useState(false);
  const [currency, setCurrency] = useState<AccountCurrency>("USD");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "success">("idle");
  const [isPending, startTransition] = useTransition();

  const loading = isPending;
  const success = phase === "success";

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsed = createAccountSchema.safeParse({
      name,
      isPractice,
      currency,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    startTransition(async () => {
      const result = await createAccount(parsed.data);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setPhase("success");
      setTimeout(() => {
        setPhase("idle");
        setName("");
        setIsPractice(false);
        setCurrency("USD");
        setError(null);
        onCreated?.();
      }, SUCCESS_HOLD_MS);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="cap">Account name</span>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Live, Backtesting"
            disabled={loading || success}
            className="h-10 flex-1 rounded-ctl border border-white/12 bg-well px-3 text-sm text-fg transition-colors duration-200 placeholder:text-fg-placeholder hover:border-cyan/35 focus:border-cyan focus:shadow-[var(--shadow-focus)] focus:outline-none disabled:opacity-60"
          />

          <motion.button
            type="submit"
            disabled={loading || success}
            whileHover={
              loading || success
                ? undefined
                : {
                    y: -1,
                    filter: "brightness(1.1)",
                    boxShadow: "var(--shadow-button-primary-hover)",
                    transition: { duration: 0.15, ease: "easeOut" },
                  }
            }
            transition={{ duration: 0.2, ease: "easeOut" }}
            whileTap={
              loading || success
                ? undefined
                : {
                    scale: 0.978,
                    transition: { duration: 0.1, ease: "easeIn" },
                  }
            }
            className={`relative h-10 w-32 shrink-0 rounded-ctl text-sm font-medium text-fg shadow-[var(--shadow-button-primary)] ${
              success
                ? "bg-[image:var(--gradient-success)]"
                : "bg-[image:var(--gradient-info)]"
            }`}
          >
            <span
              className={`inline-flex items-center justify-center transition-opacity duration-200 ease-linear ${
                loading || success ? "opacity-0" : "opacity-100"
              }`}
            >
              Add account
            </span>
            <span
              className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ease-linear ${
                loading ? "opacity-100" : "opacity-0"
              }`}
            >
              <PendingIndicator label="Saving…" />
            </span>
            <span
              className={`absolute inset-0 flex items-center justify-center gap-1.5 transition-opacity duration-200 ease-linear ${
                success ? "opacity-100" : "opacity-0"
              }`}
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Added
            </span>
          </motion.button>
        </div>
        <InlineMessage message={error} />
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-fg">Practice account</span>
          <span className="text-xs text-fg-subtle">
            Excluded from combined P&L, streak, consistency score and badges.
            Numbers show only when this account is selected on its own.
          </span>
        </div>
        <ToggleSwitch
          checked={isPractice}
          onCheckedChange={setIsPractice}
          disabled={loading || success}
          ariaLabel="Create as practice account"
        />
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <label htmlFor="new-account-currency" className="text-sm text-fg">
            Currency
          </label>
          <span className="text-xs text-fg-subtle">
            The currency your broker reports this account in. Fixed once the
            account has trades.
          </span>
        </div>
        <select
          id="new-account-currency"
          value={currency}
          onChange={(event) =>
            setCurrency(event.target.value as AccountCurrency)
          }
          disabled={loading || success}
          className="h-9 w-24 shrink-0 rounded-ctl border border-white/12 bg-well px-2 text-sm text-fg transition-colors duration-200 hover:border-cyan/35 focus:border-cyan focus:shadow-[var(--shadow-focus)] focus:outline-none disabled:opacity-60"
        >
          {ACCOUNT_CURRENCIES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}

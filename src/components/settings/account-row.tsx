"use client";

import { Archive, Check, ChevronDown, ChevronUp, Landmark } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  archiveAccount,
  moveAccount,
  renameAccount,
  setAccountCurrency,
  setDefaultAccount,
  setStartingBalance,
  togglePractice,
} from "@/actions/accounts";
import { InlineMessage } from "@/components/ui/inline-message";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { ACCOUNT_CURRENCIES, type AccountCurrency } from "@/domain/fx";
import {
  renameAccountSchema,
  setStartingBalanceSchema,
} from "@/schemas/accounts";

const CONFIRM_TIMEOUT_MS = 3000;

export interface AccountRowData {
  id: number;
  name: string;
  isPractice: boolean;
  isDefaultForNewTrades: boolean;
  currency: AccountCurrency;
  hasTrades: boolean;
  /** `accounts.starting_balance`, numeric(14, 2) as a string, in `currency`. */
  startingBalance: string;
}

/** `50000.00` → `50000`, `1234.50` → `1234.5`: what the field shows. */
function balanceFieldValue(stored: string): string {
  const value = Number(stored);
  return value === 0 ? "" : String(value);
}

interface AccountRowProps {
  account: AccountRowData;
  isFirst: boolean;
  isLast: boolean;
}

export function AccountRow({ account, isFirst, isLast }: AccountRowProps) {
  const [name, setName] = useState(account.name);
  const [balance, setBalance] = useState(
    balanceFieldValue(account.startingBalance),
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [confirmingDefault, setConfirmingDefault] = useState(false);
  const [isPending, startTransition] = useTransition();
  const archiveConfirmTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const defaultConfirmTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    setName(account.name);
  }, [account.name]);

  useEffect(() => {
    setBalance(balanceFieldValue(account.startingBalance));
  }, [account.startingBalance]);

  useEffect(() => {
    return () => {
      if (archiveConfirmTimeout.current)
        clearTimeout(archiveConfirmTimeout.current);
      if (defaultConfirmTimeout.current)
        clearTimeout(defaultConfirmTimeout.current);
    };
  }, []);

  function commitRename() {
    const trimmed = name.trim();
    if (trimmed === account.name) {
      setName(account.name);
      return;
    }

    const parsed = renameAccountSchema.safeParse({
      accountId: account.id,
      name: trimmed,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      setName(account.name);
      return;
    }

    startTransition(async () => {
      const result = await renameAccount(parsed.data);
      if (!result.success) {
        setError(result.error);
        setName(account.name);
      } else {
        setError(null);
      }
    });
  }

  // Saved on Enter or when the field loses focus, like the name.
  function commitBalance() {
    const current = balanceFieldValue(account.startingBalance);
    if (balance.trim() === current) return;

    const parsed = setStartingBalanceSchema.safeParse({
      accountId: account.id,
      startingBalance: balance.trim() === "" ? 0 : Number(balance),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      setBalance(current);
      return;
    }

    startTransition(async () => {
      const result = await setStartingBalance(parsed.data);
      if (!result.success) {
        setError(result.error);
        setBalance(current);
      } else {
        setError(null);
      }
    });
  }

  function handleMove(direction: "up" | "down") {
    startTransition(async () => {
      const result = await moveAccount({ accountId: account.id, direction });
      if (!result.success) setError(result.error);
    });
  }

  function handleTogglePractice(next: boolean) {
    startTransition(async () => {
      const result = await togglePractice({
        accountId: account.id,
        isPractice: next,
      });
      if (!result.success) setError(result.error);
    });
  }

  function handleCurrencyChange(next: AccountCurrency) {
    startTransition(async () => {
      const result = await setAccountCurrency({
        accountId: account.id,
        currency: next,
      });
      if (!result.success) setError(result.error);
    });
  }

  function handleSetDefaultClick() {
    if (!confirmingDefault) {
      setConfirmingDefault(true);
      defaultConfirmTimeout.current = setTimeout(
        () => setConfirmingDefault(false),
        CONFIRM_TIMEOUT_MS,
      );
      return;
    }

    if (defaultConfirmTimeout.current)
      clearTimeout(defaultConfirmTimeout.current);
    setConfirmingDefault(false);
    startTransition(async () => {
      const result = await setDefaultAccount({ accountId: account.id });
      if (!result.success) setError(result.error);
    });
  }

  function handleArchiveClick() {
    if (!confirmingArchive) {
      setConfirmingArchive(true);
      archiveConfirmTimeout.current = setTimeout(
        () => setConfirmingArchive(false),
        CONFIRM_TIMEOUT_MS,
      );
      return;
    }

    if (archiveConfirmTimeout.current)
      clearTimeout(archiveConfirmTimeout.current);
    setConfirmingArchive(false);
    startTransition(async () => {
      const result = await archiveAccount({ accountId: account.id });
      if (!result.success) setError(result.error);
    });
  }

  return (
    <div className="card-surface edge relative flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xs bg-[image:var(--gradient-info)]">
          <Landmark className="h-4 w-4 text-white" aria-hidden="true" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              } else if (event.key === "Escape") {
                setName(account.name);
                event.currentTarget.blur();
              }
            }}
            className="h-9 min-w-0 flex-1 rounded-xs border border-transparent bg-transparent px-2 text-sm font-medium text-fg transition-colors duration-200 hover:border-cyan/35 focus:border-cyan focus:shadow-[var(--shadow-focus)] focus:outline-none"
          />

          <div className="flex min-h-[20px] items-center gap-2 px-2">
            {account.isPractice && (
              <span className="cap-practice rounded-xs px-1.5 py-0.5">
                Practice
              </span>
            )}
            {account.isDefaultForNewTrades && (
              <span className="rounded-xs bg-cyan-dim px-1.5 py-0.5 text-xs font-semibold text-cyan">
                Default
              </span>
            )}
            <span className="rounded-xs bg-[image:var(--gradient-dark-soft)] px-1.5 py-0.5 font-mono text-fg-muted text-xs shadow-[var(--shadow-dark-soft)]">
              {account.currency}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-white/8 border-t pt-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-fg-muted">Practice account</span>
          <ToggleSwitch
            checked={account.isPractice}
            onCheckedChange={handleTogglePractice}
            disabled={isPending}
            ariaLabel="Practice account"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <label
              htmlFor={`account-currency-${account.id}`}
              className="text-xs text-fg-muted"
            >
              Currency
            </label>
            {account.hasTrades && (
              <span
                id={`account-currency-lock-${account.id}`}
                className="text-xs text-fg-subtle"
              >
                Locked — this account has trades
              </span>
            )}
          </div>
          <select
            id={`account-currency-${account.id}`}
            value={account.currency}
            onChange={(event) =>
              handleCurrencyChange(event.target.value as AccountCurrency)
            }
            disabled={account.hasTrades || isPending}
            aria-describedby={
              account.hasTrades
                ? `account-currency-lock-${account.id}`
                : undefined
            }
            className="h-9 w-24 shrink-0 rounded-ctl border border-white/12 bg-well px-2 text-sm text-fg transition-colors duration-200 hover:border-cyan/35 focus:border-cyan focus:shadow-[var(--shadow-focus)] focus:outline-none disabled:opacity-60 disabled:hover:border-white/12"
          >
            {ACCOUNT_CURRENCIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <label
              htmlFor={`account-balance-${account.id}`}
              className="text-xs text-fg-muted"
            >
              Starting balance
            </label>
            <span className="text-xs text-fg-subtle">
              Where the equity curve starts
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <input
              id={`account-balance-${account.id}`}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={balance}
              onChange={(event) => setBalance(event.target.value)}
              onBlur={commitBalance}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              placeholder="0"
              disabled={isPending}
              className="h-9 w-32 rounded-ctl border border-white/12 bg-well px-2 text-right font-mono text-sm text-fg tabular-nums transition-colors duration-200 placeholder:text-fg-placeholder hover:border-cyan/35 focus:border-cyan focus:shadow-[var(--shadow-focus)] focus:outline-none disabled:opacity-60"
            />
            <span className="w-8 text-fg-subtle text-xs">
              {account.currency}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span
            className={`text-xs ${confirmingDefault ? "text-cyan" : "text-fg-muted"}`}
          >
            {confirmingDefault
              ? "Click again to confirm"
              : "Default for new trades"}
          </span>
          <button
            type="button"
            aria-label={
              account.isDefaultForNewTrades
                ? "Default account for new trades"
                : confirmingDefault
                  ? "Confirm set as default for new trades"
                  : "Set as default for new trades"
            }
            title={
              account.isDefaultForNewTrades
                ? "Default account for new trades"
                : "Set as default for new trades"
            }
            disabled={account.isDefaultForNewTrades || isPending}
            onClick={handleSetDefaultClick}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xs transition-colors ${
              account.isDefaultForNewTrades
                ? "text-cyan"
                : confirmingDefault
                  ? "bg-cyan-glow text-cyan"
                  : "text-fg-muted hover:text-fg"
            }`}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 border-white/8 border-t pt-3">
        <div className="flex h-10 shrink-0 items-center overflow-hidden rounded-xs border border-white/12">
          <button
            type="button"
            aria-label="Move up"
            title="Move up in list order"
            disabled={isFirst || isPending}
            onClick={() => handleMove("up")}
            className="flex h-full w-8 items-center justify-center text-fg-muted transition-colors hover:text-fg disabled:opacity-30"
          >
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="h-full w-px bg-white/12" />
          <button
            type="button"
            aria-label="Move down"
            title="Move down in list order"
            disabled={isLast || isPending}
            onClick={() => handleMove("down")}
            className="flex h-full w-8 items-center justify-center text-fg-muted transition-colors hover:text-fg disabled:opacity-30"
          >
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={handleArchiveClick}
          className={`ml-auto flex h-10 shrink-0 items-center gap-1.5 rounded-xs px-2 text-xs transition-colors ${
            confirmingArchive
              ? "bg-practice-dim text-practice"
              : "text-fg-muted hover:text-fg"
          }`}
        >
          <Archive className="h-3.5 w-3.5" aria-hidden="true" />
          {confirmingArchive ? "Confirm" : "Archive"}
        </button>
      </div>
      <InlineMessage message={error} />
    </div>
  );
}

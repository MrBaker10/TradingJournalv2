"use client";

import {
  Archive,
  ChevronDown,
  ChevronUp,
  Landmark,
  Pencil,
  Star,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  archiveAccount,
  moveAccount,
  setDefaultAccount,
} from "@/actions/accounts";
import type { AccountRulesRow } from "@/db/queries/account-rules";
import { amountToCents } from "@/domain/commission";
import type { AccountCurrency } from "@/domain/fx";
import { formatCents } from "@/lib/money";
import type { CommissionRateData } from "./account-commission-rates";

export interface AccountRowData {
  id: number;
  name: string;
  isPractice: boolean;
  isDefaultForNewTrades: boolean;
  currency: AccountCurrency;
  hasTrades: boolean;
  hasLedgerEntries: boolean;
  /** `accounts.starting_balance`, numeric(14, 2) as a string, in `currency`. */
  startingBalance: string;
  /** Per-side rates per instrument (commissions). */
  commissionRates: CommissionRateData[];
  /** The prop firm program link, or null when not linked. */
  rules: AccountRulesRow | null;
}

const ACTION_CLASS =
  "flex h-10 w-10 items-center justify-center rounded-ctl text-fg-muted transition-colors hover:bg-white/5 hover:text-fg focus-visible:outline-cyan disabled:opacity-30";

export function AccountRow({
  account,
  isFirst,
  isLast,
  disabled,
  pending,
  onEdit,
}: {
  account: AccountRowData;
  isFirst: boolean;
  isLast: boolean;
  disabled: boolean;
  pending: boolean;
  onEdit: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<"archive" | "default" | null>(
    null,
  );
  const busy = disabled || isPending;
  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    setConfirming(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success)
          toast.error(result.error ?? "Couldn't update the account");
      } catch {
        toast.error("Couldn't update the account. Try again.");
      }
    });
  }
  return (
    <div className="p-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-ctl bg-[image:var(--gradient-info-soft)] shadow-[var(--shadow-info-soft)]">
          <Landmark className="h-4 w-4 text-cyan" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-sm font-medium text-fg">
              {account.name}
            </h3>
            {account.isPractice && (
              <span className="rounded-xs bg-practice-dim px-2 py-0.5 text-xs text-practice">
                Practice
              </span>
            )}
            {account.isDefaultForNewTrades && (
              <span className="rounded-xs bg-white/5 px-2 py-0.5 text-xs text-fg-muted">
                Default
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-fg-subtle">
            <span className="font-mono">{account.currency}</span>
            <span className="mx-2 text-fg-placeholder">/</span>Starting balance{" "}
            <span className="font-mono tabular-nums text-fg-muted">
              {formatCents(amountToCents(account.startingBalance), {
                currency: account.currency,
              })}
            </span>
            {account.rules && (
              <>
                <span className="mx-2 text-fg-placeholder">/</span>
                <span className="text-fg-muted">
                  {account.rules.firmName} · {account.rules.programName}
                </span>
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          disabled={pending || isPending}
          aria-label={`Edit ${account.name}`}
          className="flex h-10 items-center gap-2 rounded-ctl px-3 text-sm text-fg-muted transition-colors hover:bg-white/5 hover:text-fg focus-visible:outline-cyan disabled:opacity-30"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Edit
        </button>
        <div className="flex w-full items-center justify-end border-t border-white/8 pt-2 sm:w-auto sm:border-t-0 sm:border-l sm:pt-0 sm:pl-3">
          <button
            type="button"
            onClick={() => setConfirming("default")}
            disabled={busy || account.isDefaultForNewTrades}
            title="Set as default"
            aria-label={`Set ${account.name} as default`}
            className={ACTION_CLASS}
          >
            <Star className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() =>
              run(() => moveAccount({ accountId: account.id, direction: "up" }))
            }
            disabled={busy || isFirst}
            aria-label={`Move ${account.name} up`}
            className={ACTION_CLASS}
          >
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() =>
              run(() =>
                moveAccount({ accountId: account.id, direction: "down" }),
              )
            }
            disabled={busy || isLast}
            aria-label={`Move ${account.name} down`}
            className={ACTION_CLASS}
          >
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setConfirming("archive")}
            disabled={busy}
            aria-label={`Archive ${account.name}`}
            className={ACTION_CLASS}
          >
            <Archive className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      {confirming && !disabled && (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-3 border-t border-white/8 pt-3 text-sm">
          <span className="mr-auto text-fg-muted">
            {confirming === "archive"
              ? "Archive this account? Its trades will be kept."
              : "Use this account by default for new trades?"}
          </span>
          <button
            type="button"
            onClick={() => setConfirming(null)}
            className="h-10 px-3 text-fg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              run(() =>
                confirming === "archive"
                  ? archiveAccount({ accountId: account.id })
                  : setDefaultAccount({ accountId: account.id }),
              )
            }
            className="h-10 rounded-ctl bg-white/5 px-3 text-fg"
          >
            {confirming === "archive" ? "Archive account" : "Set default"}
          </button>
        </div>
      )}
    </div>
  );
}

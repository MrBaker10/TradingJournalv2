"use client";

import { ChevronRight } from "lucide-react";
import type { AccountRulesRow } from "@/db/queries/account-rules";
import { amountToCents } from "@/domain/commission";
import type { AccountCurrency } from "@/domain/fx";
import type { RuleState } from "@/domain/rule-status";
import { formatCents } from "@/lib/money";
import type { AttemptStatus } from "@/lib/prop-firms/rule-status";
import { cn } from "@/lib/utils";
import type { CommissionRateData } from "./account-commission-rates";
import { RuleDot } from "./rule-dot";

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
  /** The current attempt and its rule status, null when not linked. */
  attempt: AttemptStatus | null;
  /** The rule dot: worst checked rule, null when linked but unreadable. */
  ruleState: RuleState | null;
}

/** The practice marker: amber stripe plus the word (Design.md §5). */
export function PracticeTag() {
  return (
    <span className="rounded-full border border-amber-400/50 px-1.5 py-0.5 text-[10px] text-amber-300">
      Practice
    </span>
  );
}

/**
 * Every active account in the dense table of Design.md §3.4 and §3.8. The
 * name is a button stretched over its row, so the whole row opens the sheet
 * and the keyboard reaches it; the row shows the focus ring.
 */
export function AccountsTable({
  accounts,
  openId,
  onOpen,
}: {
  accounts: AccountRowData[];
  openId: number | null;
  onOpen: (accountId: number) => void;
}) {
  // `relative` makes the scroll box the containing block of the stretched
  // buttons and the sr-only header, or they would widen the page at 390 px.
  return (
    <div className="relative overflow-x-auto rounded-xl border">
      <table className="w-full text-sm [&_td:not(:first-child)]:whitespace-nowrap [&_th]:whitespace-nowrap">
        <thead>
          <tr className="border-b bg-muted/30 text-left text-muted-foreground text-xs">
            <th className="px-4 py-2 font-normal">Name</th>
            <th className="px-4 py-2 font-normal">Currency</th>
            <th className="px-4 py-2 text-right font-normal">
              Starting balance
            </th>
            <th className="px-4 py-2 font-normal">Prop firm</th>
            <th className="w-8">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr
              key={account.id}
              aria-current={account.id === openId ? "true" : undefined}
              className="group relative border-b transition-colors duration-150 last:border-b-0 hover:bg-accent has-focus-visible:bg-accent has-focus-visible:ring-3 has-focus-visible:ring-ring/50 aria-current:bg-muted"
            >
              {/* The stripe sits on the cell: a row's own shadow does not
                  render in every browser. */}
              <td
                className={cn(
                  "px-4 py-2.5",
                  account.isPractice &&
                    "shadow-[inset_2px_0_0_0_var(--color-amber-400)]",
                )}
              >
                <span className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpen(account.id)}
                    className="text-left outline-none after:absolute after:inset-0"
                  >
                    {account.name}
                  </button>
                  {account.isPractice && <PracticeTag />}
                  {account.isDefaultForNewTrades && (
                    <span className="text-muted-foreground text-xs">
                      Default
                    </span>
                  )}
                </span>
              </td>
              <td className="px-4 py-2.5 font-mono tabular-nums">
                {account.currency}
              </td>
              <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                {formatCents(amountToCents(account.startingBalance), {
                  currency: account.currency,
                })}
              </td>
              <td className="px-4 py-2.5">
                {account.rules ? (
                  <span className="flex items-center gap-2">
                    <RuleDot state={account.ruleState} />
                    {account.rules.firmName}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="pr-3">
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 text-muted-foreground transition-[translate] duration-150 group-hover:translate-x-0.5"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

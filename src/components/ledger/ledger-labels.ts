import type { ExpenseCategory, LedgerKind } from "@/domain/ledger";

export const LEDGER_KIND_LABELS: Record<LedgerKind, string> = {
  expense: "Expense",
  payout: "Payout",
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  evaluation: "Evaluation",
  reset: "Reset",
  activation: "Activation",
  subscription: "Subscription",
  data: "Data",
  other: "Other",
};

/** "Expense · Reset" or "Payout" (Design.md §4.25). */
export function ledgerEntryLabel(
  kind: LedgerKind,
  category: ExpenseCategory | null,
): string {
  return category === null
    ? LEDGER_KIND_LABELS[kind]
    : `${LEDGER_KIND_LABELS[kind]} · ${EXPENSE_CATEGORY_LABELS[category]}`;
}

// Ledger entries are real money around the user's prop trading: expenses paid
// out and payouts received (GLOSSARY.md, Ledger). They never enter trading
// P&L, the equity curve, the calendar or progress (docs/adr/0002).

export const LEDGER_KINDS = ["expense", "payout"] as const;
export type LedgerKind = (typeof LEDGER_KINDS)[number];

export const EXPENSE_CATEGORIES = [
  "evaluation",
  "reset",
  "activation",
  "subscription",
  "data",
  "other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** What the user reads when an entry breaks a rule (Design.md §4.25). */
export const LEDGER_MESSAGES = {
  categoryMissing: "Pick a category for this expense.",
  categoryOnPayout: "A payout has no category.",
  amountFormat: "Amount in USD — digits and up to two decimals.",
  amountNegative: "The amount cannot be negative.",
} as const;

export interface LedgerEntryCheck {
  kind: LedgerKind;
  category: ExpenseCategory | null;
  amountCents: number;
}

export type LedgerEntryResult =
  | { success: true }
  | { success: false; field: "category" | "amount"; error: string };

/**
 * An expense has exactly one category, a payout none. Its own function so the
 * form schema can check it before an amount in cents exists.
 */
export function validateLedgerCategory(
  kind: LedgerKind,
  category: ExpenseCategory | null,
): LedgerEntryResult {
  if (kind === "expense" && category === null) {
    return {
      success: false,
      field: "category",
      error: LEDGER_MESSAGES.categoryMissing,
    };
  }
  if (kind === "payout" && category !== null) {
    return {
      success: false,
      field: "category",
      error: LEDGER_MESSAGES.categoryOnPayout,
    };
  }
  return { success: true };
}

/**
 * The rules a ledger entry holds whatever the form sent: the category rule
 * above, and the amount is whole, non-negative USD cents — the kind carries
 * the sign. Zero is allowed: a free reset is still a reset on record. The
 * table's check constraints hold the same rules; this is where the user hears
 * about them.
 */
export function validateLedgerEntry(
  entry: LedgerEntryCheck,
): LedgerEntryResult {
  const category = validateLedgerCategory(entry.kind, entry.category);
  if (!category.success) return category;
  if (!Number.isInteger(entry.amountCents)) {
    return {
      success: false,
      field: "amount",
      error: LEDGER_MESSAGES.amountFormat,
    };
  }
  if (entry.amountCents < 0) {
    return {
      success: false,
      field: "amount",
      error: LEDGER_MESSAGES.amountNegative,
    };
  }
  return { success: true };
}

/** Payouts and expenses as sums of whole cents, each in one currency. */
export interface LedgerTotalsCents {
  payoutsCents: number;
  expensesCents: number;
}

/**
 * Payouts minus expenses. Both sums arrive already converted and rounded per
 * entry, so the net needs no rounding of its own and the three figures on the
 * page add up to one another.
 */
export function ledgerNetCents(totals: LedgerTotalsCents): number {
  return totals.payoutsCents - totals.expensesCents;
}

/**
 * An amount with the sign it has for the trader: a payout comes in, an
 * expense goes out. Whole cents, so the minus is exact; zero stays 0, never
 * -0, which Intl writes as "-$0.00".
 */
export function signedLedgerCents(entry: {
  kind: LedgerKind;
  amountCents: number;
}): number {
  if (entry.amountCents === 0) return 0;
  return entry.kind === "payout" ? entry.amountCents : -entry.amountCents;
}

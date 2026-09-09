export interface AssignedAccount {
  accountId: number;
  isPractice: boolean;
}

// "Money aggregates multiply by assigned account count, count aggregates do
// not." (coding-standards.md) — this module owns that multiplier. Practice
// accounts never contribute to a combined figure, so they simply don't count.
export function realAccountMultiplier(assigned: AssignedAccount[]): number {
  return assigned.filter((account) => !account.isPractice).length;
}

// Count aggregates (trades logged, win rate, avg R, hold time, MFE/MAE) never
// multiply — one trade is one decision regardless of account count. This
// carries no logic; it exists so call sites read symmetrically with
// realAccountMultiplier and can't accidentally reuse the wrong one.
export function countMultiplier(): 1 {
  return 1;
}

// Applies the money multiplier to one trade's P&L (integer cents) for a
// combined ("all accounts") aggregate. A view filtered to one selected
// account must NOT call this — it uses the per-account value unmultiplied.
export function applyMoneyMultiplier(
  pnlCents: number,
  assigned: AssignedAccount[],
): number {
  return pnlCents * realAccountMultiplier(assigned);
}

// True once a trade has at least one real assigned account. A practice-only
// trade contributes nothing to a money aggregate but must stay visible
// elsewhere — "nothing disappears silently" (project-overview.md).
export function contributesToMoneyAggregate(
  assigned: AssignedAccount[],
): boolean {
  return realAccountMultiplier(assigned) > 0;
}

// "Every combined query filters accounts.is_practice = false first"
// (coding-standards.md) — the one filter every combined figure applies
// before anything else.
export function excludePracticeAccounts<T extends { isPractice: boolean }>(
  items: T[],
): T[] {
  return items.filter((item) => !item.isPractice);
}

export interface AccountForSwitcher {
  id: number;
  name: string;
  isPractice: boolean;
  sortOrder: number;
  archivedAt: Date | null;
}

export interface GroupedAccounts {
  real: AccountForSwitcher[];
  practice: AccountForSwitcher[];
}

// Design.md §4.12: archived accounts never appear, real accounts come first
// in sort order, practice accounts follow in their own sort order below a
// divider.
export function groupAccountsForSwitcher(
  accounts: AccountForSwitcher[],
): GroupedAccounts {
  const active = accounts.filter((account) => account.archivedAt === null);
  const bySortOrder = (a: AccountForSwitcher, b: AccountForSwitcher) =>
    a.sortOrder - b.sortOrder;

  return {
    real: active.filter((account) => !account.isPractice).sort(bySortOrder),
    practice: active.filter((account) => account.isPractice).sort(bySortOrder),
  };
}

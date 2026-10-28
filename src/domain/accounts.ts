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

// Design-v1.md §4.12: archived accounts never appear, real accounts come first
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

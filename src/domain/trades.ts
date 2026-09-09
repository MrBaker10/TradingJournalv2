export interface AccountAssignmentCheck {
  taken: boolean;
  accountIds: number[];
}

export type AccountAssignmentResult =
  | { success: true }
  | { success: false; error: string };

// "A trade must belong to at least one account" (project-overview.md) applies
// only to taken trades — confirmed with Sascha. A missed setup was never
// executed, so it can't be attributed to any account and must carry zero
// trade_accounts rows. Runs on the ownership-filtered account id list, after
// client-supplied ids have already been checked against the current user, so
// it validates the invariant that actually lands in the database.
export function validateTradeAccountAssignment(
  input: AccountAssignmentCheck,
): AccountAssignmentResult {
  if (input.taken && input.accountIds.length === 0) {
    return {
      success: false,
      error: "A taken trade needs at least one account.",
    };
  }
  if (!input.taken && input.accountIds.length > 0) {
    return {
      success: false,
      error: "A missed setup cannot be assigned to an account.",
    };
  }
  return { success: true };
}

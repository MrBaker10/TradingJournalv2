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

export const MAX_SCREENSHOTS_PER_TRADE = 3;

export type ScreenshotSlotResult =
  | { success: true }
  | { success: false; error: string };

// "Up to three screenshots per trade" (project-overview.md, Core Feature C).
// Runs against the current count fetched fresh from the DB, so it holds for
// both the create-time upload and a later attach, with no distinction between
// the two call sites.
export function canAddScreenshot(existingCount: number): ScreenshotSlotResult {
  if (existingCount >= MAX_SCREENSHOTS_PER_TRADE) {
    return {
      success: false,
      error: `A trade can have at most ${MAX_SCREENSHOTS_PER_TRADE} screenshots.`,
    };
  }
  return { success: true };
}

import { dollarsToCents } from "../lib/money.ts";
import { toScaledPrice } from "./pnl.ts";

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

/** The marks an import leaves on a trade, as the row stores them. */
export interface ImportMarks {
  stopImported: boolean;
  pnlSource: string | null;
  fxRateDate: string | null;
}

/** Two stored decimals, compared at the precision their column keeps. */
function sameValue(
  a: string | null,
  b: string | null,
  scale: (value: number) => bigint | number,
): boolean {
  if (a === null || b === null) return a === b;
  return scale(Number(a)) === scale(Number(b));
}

/**
 * What an edit does to the marks an import leaves on a trade: a stop or a
 * P&L the file supplied (src/db/queries/import.ts, TOUCHED).
 *
 * The form always sends the whole trade, so a mark is cleared only when its
 * value actually changed — saving an untouched form keeps the trade
 * removable by an undo. Changing the P&L also ends the nightly FX
 * correction: the hand edit wins over the rate (decided 2026-09-25).
 */
export function importMarksAfterEdit(
  existing: ImportMarks & {
    stopPrice: string | null;
    pnlOverride: string | null;
  },
  edited: { stopPrice: string | null; pnlOverride: string | null },
): ImportMarks {
  const sameStop = sameValue(
    existing.stopPrice,
    edited.stopPrice,
    toScaledPrice,
  );
  const samePnl = sameValue(
    existing.pnlOverride,
    edited.pnlOverride,
    dollarsToCents,
  );

  return {
    stopImported: sameStop && existing.stopImported,
    pnlSource: samePnl ? existing.pnlSource : null,
    fxRateDate: samePnl ? existing.fxRateDate : null,
  };
}

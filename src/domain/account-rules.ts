import { messageKey } from "../lib/i18n/message-keys.ts";
// Account rules: the rule values a linked account was bought under, entered by
// the user and unaffected by later changes to the program (GLOSSARY.md,
// docs/adr/0001). All money is USD, like every prop firm limit.

export const DRAWDOWN_TYPES = [
  "static",
  "eod_trailing",
  "intraday_trailing",
] as const;
export type DrawdownType = (typeof DRAWDOWN_TYPES)[number];

/** What the user reads when the rules break a rule (Design-v1.md §4.12). */
export const ACCOUNT_RULES_MESSAGES = {
  lockLevelType: messageKey("validation.lockLevelType"),
  practice: messageKey("validation.practiceNotLinkable"),
  practiceLinked: messageKey("validation.practiceLinked"),
  startingBalance: messageKey("validation.startingBalanceForLink"),
} as const;

export interface AccountRulesCheck {
  drawdownType: DrawdownType;
  lockLevelCents: number | null;
}

export type AccountRulesResult =
  | { success: true }
  | { success: false; field: "lockLevel"; error: string };

/**
 * The rules that span fields. Each single value's bounds live in the form
 * schema and the table's check constraints; this is the one rule that needs
 * two fields: the floor only stops trailing on a drawdown that trails at the
 * end of the day.
 */
export function validateAccountRules(
  rules: AccountRulesCheck,
): AccountRulesResult {
  if (rules.lockLevelCents !== null && rules.drawdownType !== "eod_trailing") {
    return {
      success: false,
      field: "lockLevel",
      error: ACCOUNT_RULES_MESSAGES.lockLevelType,
    };
  }
  return { success: true };
}

export interface LinkableCheck {
  isPractice: boolean;
  /** `accounts.starting_balance_usd` in cents: the attempt's starting balance. */
  startingBalanceUsdCents: number;
}

export type LinkableResult =
  | { success: true }
  | { success: false; field: "isPractice" | "startingBalance"; error: string };

/**
 * Whether an account, as it will be saved, may carry a link. Practice stays
 * outside every rule (AGENTS.md, Practice), and without a starting balance
 * there is no balance to measure the target or the floor from.
 */
export function checkLinkable(account: LinkableCheck): LinkableResult {
  if (account.isPractice) {
    return {
      success: false,
      field: "isPractice",
      error: ACCOUNT_RULES_MESSAGES.practice,
    };
  }
  if (account.startingBalanceUsdCents <= 0) {
    return {
      success: false,
      field: "startingBalance",
      error: ACCOUNT_RULES_MESSAGES.startingBalance,
    };
  }
  return { success: true };
}

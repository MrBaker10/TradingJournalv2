import {
  type AccountRulesRow,
  getAccountRules,
  getAttempt,
} from "@/db/queries/account-rules";
import { evaluateRules, type RuleStatus } from "@/domain/rule-status";
import type { IsoDate } from "@/domain/streak";

// Where the attempt query meets the pure rule evaluation, once for every
// screen that shows a rule status: the account's settings and the dashboard
// card (Design.md §4.12, "Rule status").

export interface AttemptStatus {
  /** The evaluation start, or the latest reset when that is later. */
  start: IsoDate;
  status: RuleStatus;
}

/**
 * The rule status of a linked account's current attempt, or null when the
 * attempt cannot be read (an account that is not the user's). `today` is the
 * user's calendar date.
 */
export async function loadRuleStatus(
  userId: number,
  link: AccountRulesRow,
  today: IsoDate,
): Promise<AttemptStatus | null> {
  const attempt = await getAttempt(userId, link.accountId, today);
  if (attempt === null) return null;
  return {
    start: attempt.start,
    status: evaluateRules({
      rules: link,
      startingBalanceCents: link.startingBalanceUsdCents,
      days: attempt.days,
      payouts: attempt.payouts,
      today,
    }),
  };
}

/** A linked account's link and the rule status of its current attempt. */
export interface LinkedRuleStatus {
  link: AccountRulesRow;
  attempt: AttemptStatus;
}

/**
 * The selected account's link and rule status for the dashboard card, or
 * null — "All accounts", an unlinked, archived or someone else's account all
 * show no card.
 */
export async function loadSelectedRuleStatus(
  userId: number,
  selectedAccountId: number | null,
  today: IsoDate,
): Promise<LinkedRuleStatus | null> {
  if (selectedAccountId === null) return null;
  const link = await getAccountRules(userId, selectedAccountId);
  if (link === null) return null;
  const attempt = await loadRuleStatus(userId, link, today);
  return attempt === null ? null : { link, attempt };
}

import * as z from "zod";
import {
  DRAWDOWN_TYPES,
  validateAccountRules,
} from "../domain/account-rules.ts";
import { type MessageKey, messageKey } from "../lib/i18n/message-keys.ts";
import { exactCents } from "../lib/money.ts";

/**
 * The largest rule amount accepted, for the same reason as
 * `MAX_STARTING_BALANCE`: `exactCents` reads a typed number exactly only up to
 * about a billion.
 */
export const MAX_RULE_AMOUNT = 100_000_000;

/**
 * A USD amount above zero; the action turns it into cents with `exactCents`.
 * An empty field arrives as `undefined` and hears `emptyKey`, which names it; typed text
 * arrives as NaN and hears the number format (Design-v1.md §4.12).
 */
function ruleAmount(emptyKey: MessageKey) {
  return z
    .number({
      error: (issue) =>
        issue.input === undefined
          ? emptyKey
          : messageKey("validation.amountNumber"),
    })
    .gt(0, messageKey("validation.amountAboveZero"))
    .max(MAX_RULE_AMOUNT, messageKey("validation.amountTooLarge"))
    .refine(
      (value) => exactCents(value) !== null,
      messageKey("validation.twoDecimals"),
    );
}

/**
 * The account rules as the link form sends them (Design-v1.md §4.12). Optional
 * rules are null when the program has none. Whether the account may carry a
 * link at all — real, with a starting balance — is the server's check
 * (src/db/queries/account-editor.ts).
 */
// Relative imports, unlike `accounts.ts`: they keep this file within Vitest's
// reach (src/schemas/__tests__/account-rules.test.ts).
const accountRulesFields = z.object({
  programId: z.number().int().positive(messageKey("validation.pickProgram")),
  evaluationStart: z.iso.date(messageKey("validation.pickDate")),
  profitTarget: ruleAmount(messageKey("validation.enterProfitTarget")),
  drawdownAmount: ruleAmount(messageKey("validation.enterMaxDrawdown")),
  drawdownType: z.enum(DRAWDOWN_TYPES),
  lockLevel: ruleAmount(messageKey("validation.enterLockLevel")).nullable(),
  dailyLossLimit: ruleAmount(
    messageKey("validation.enterDailyLossLimit"),
  ).nullable(),
  consistencyPercent: z
    .number({ error: messageKey("validation.consistencyPercent") })
    .int(messageKey("validation.consistencyPercent"))
    .min(1, messageKey("validation.consistencyPercent"))
    .max(100, messageKey("validation.consistencyPercent"))
    .nullable(),
  minTradingDays: z
    .number({ error: messageKey("validation.daysWholeNumber") })
    .int(messageKey("validation.daysWholeNumber"))
    .min(1, messageKey("validation.daysAtLeastOne"))
    .max(1000, messageKey("validation.daysTooMany"))
    .nullable(),
});

export const accountRulesSchema = accountRulesFields.superRefine(
  (rules, ctx) => {
    const check = validateAccountRules({
      drawdownType: rules.drawdownType,
      lockLevelCents:
        rules.lockLevel === null ? null : exactCents(rules.lockLevel),
    });
    if (!check.success) {
      ctx.addIssue({
        code: "custom",
        path: [check.field],
        message: check.error,
      });
    }
  },
  {
    when: (payload) =>
      accountRulesFields
        .pick({ drawdownType: true, lockLevel: true })
        .safeParse(payload.value).success,
  },
);

export type AccountRulesInput = z.input<typeof accountRulesSchema>;

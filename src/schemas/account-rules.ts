import * as z from "zod";
import {
  DRAWDOWN_TYPES,
  validateAccountRules,
} from "../domain/account-rules.ts";
import { exactCents } from "../lib/money.ts";

/**
 * The largest rule amount accepted, for the same reason as
 * `MAX_STARTING_BALANCE`: `exactCents` reads a typed number exactly only up to
 * about a billion.
 */
export const MAX_RULE_AMOUNT = 100_000_000;

/**
 * A USD amount above zero; the action turns it into cents with `exactCents`.
 * An empty field arrives as `undefined` and is named by `label`; typed text
 * arrives as NaN and hears the number format (Design-v1.md §4.12).
 */
function ruleAmount(label: string) {
  return z
    .number({
      error: (issue) =>
        issue.input === undefined
          ? `Enter the ${label}`
          : "Enter the amount as a number",
    })
    .gt(0, "Enter an amount above 0")
    .max(MAX_RULE_AMOUNT, "That amount is too large")
    .refine((value) => exactCents(value) !== null, "At most two decimals");
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
  programId: z.number().int().positive("Pick a prop firm program"),
  evaluationStart: z.iso.date("Pick a date"),
  profitTarget: ruleAmount("profit target"),
  drawdownAmount: ruleAmount("max drawdown"),
  drawdownType: z.enum(DRAWDOWN_TYPES),
  lockLevel: ruleAmount("lock level").nullable(),
  dailyLossLimit: ruleAmount("daily loss limit").nullable(),
  consistencyPercent: z
    .number({ error: "Enter a whole percentage from 1 to 100" })
    .int("Enter a whole percentage from 1 to 100")
    .min(1, "Enter a whole percentage from 1 to 100")
    .max(100, "Enter a whole percentage from 1 to 100")
    .nullable(),
  minTradingDays: z
    .number({ error: "Enter the days as a whole number" })
    .int("Enter the days as a whole number")
    .min(1, "Enter at least 1 day")
    .max(1000, "That is too many days")
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

import * as z from "zod";
import { ACCOUNT_CURRENCIES } from "@/domain/fx";
import { messageKey } from "@/lib/i18n/message-keys";
import { exactCents } from "@/lib/money";
import { accountRulesSchema } from "./account-rules";
import { commissionField } from "./trades";

export const accountIdSchema = z.object({
  accountId: z.number().int().positive(),
});

export const accountCurrencySchema = z.enum(ACCOUNT_CURRENCIES);

/**
 * The largest starting balance accepted. `numeric(14, 2)` would hold far more,
 * but `exactCents` reads a typed number exactly only up to about a billion —
 * past that a float cannot tell the second decimal apart — so the bound sits
 * well inside that range instead of at the column's.
 */
export const MAX_STARTING_BALANCE = 100_000_000;

/**
 * The account's size, in its own currency, as the user typed it. Optional:
 * leaving it out means no starting balance, which is 0 (decided 2026-09-25,
 * account-balance). It stays a number here, like every other amount the forms
 * send, so a form can hand `parsed.data` to the action; the action turns it
 * into cents with `exactCents`. The two-decimal rule lives there, where it is
 * tested — this file's `@/` imports keep it out of Vitest's reach.
 */
export const startingBalanceField = z
  .number({ error: messageKey("validation.balanceNumber") })
  .min(0, messageKey("validation.balanceNegative"))
  .max(MAX_STARTING_BALANCE, messageKey("validation.balanceTooLarge"))
  .refine(
    (value) => exactCents(value) !== null,
    messageKey("validation.twoDecimals"),
  );

const accountFields = {
  name: z
    .string()
    .trim()
    .min(1, messageKey("validation.accountNameRequired"))
    .max(100),
  isPractice: z.boolean().default(false),
  currency: accountCurrencySchema.default("USD"),
};

const commissionRatesField = z
  .array(
    z.object({
      instrumentId: z
        .number()
        .int()
        .positive(messageKey("validation.pickInstrument")),
      perSide: commissionField,
    }),
  )
  .superRefine((rates, ctx) => {
    const seen = new Set<number>();
    rates.forEach((rate, index) => {
      if (seen.has(rate.instrumentId)) {
        ctx.addIssue({
          code: "custom",
          path: [index, "instrumentId"],
          message: messageKey("validation.oneRatePerInstrument"),
        });
      }
      seen.add(rate.instrumentId);
    });
  });

export const createAccountSchema = z.object({
  ...accountFields,
  startingBalance: startingBalanceField.optional(),
  commissionRates: commissionRatesField.default([]),
  // The prop firm program link; null means not linked (docs/adr/0001).
  rules: accountRulesSchema.nullable().default(null),
});

export const updateAccountSchema = createAccountSchema.extend({
  accountId: z.number().int().positive(),
});

export const moveAccountSchema = z.object({
  accountId: z.number().int().positive(),
  direction: z.enum(["up", "down"]),
});

export const setSelectedAccountSchema = z.object({
  accountId: z.number().int().positive().nullable(),
});

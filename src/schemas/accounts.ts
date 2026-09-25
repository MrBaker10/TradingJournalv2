import * as z from "zod";
import { ACCOUNT_CURRENCIES } from "@/domain/fx";
import { exactCents } from "@/lib/money";

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
  .number({ error: "Enter the balance as a number" })
  .min(0, "The starting balance cannot be negative")
  .max(MAX_STARTING_BALANCE, "That starting balance is too large")
  .refine((value) => exactCents(value) !== null, "At most two decimals");

const accountFields = {
  name: z.string().trim().min(1, "Name is required").max(100),
  isPractice: z.boolean().default(false),
  currency: accountCurrencySchema.default("USD"),
};

export const createAccountSchema = z.object({
  ...accountFields,
  startingBalance: startingBalanceField.optional(),
});

// Built from the shared fields, not from createAccountSchema: a rename must
// never carry a starting balance it could reset.
export const renameAccountSchema = z.object({
  ...accountFields,
  accountId: z.number().int().positive(),
});

export const setStartingBalanceSchema = accountIdSchema.extend({
  startingBalance: startingBalanceField,
});

export const setAccountCurrencySchema = accountIdSchema.extend({
  currency: accountCurrencySchema,
});

export const moveAccountSchema = z.object({
  accountId: z.number().int().positive(),
  direction: z.enum(["up", "down"]),
});

export const togglePracticeSchema = accountIdSchema.extend({
  isPractice: z.boolean(),
});

export const setSelectedAccountSchema = z.object({
  accountId: z.number().int().positive().nullable(),
});

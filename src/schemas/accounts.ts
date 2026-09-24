import * as z from "zod";
import { ACCOUNT_CURRENCIES } from "@/domain/fx";

export const accountIdSchema = z.object({
  accountId: z.number().int().positive(),
});

export const accountCurrencySchema = z.enum(ACCOUNT_CURRENCIES);

export const createAccountSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  isPractice: z.boolean().default(false),
  currency: accountCurrencySchema.default("USD"),
});

export const renameAccountSchema = createAccountSchema.extend({
  accountId: z.number().int().positive(),
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

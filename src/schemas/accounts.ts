import * as z from "zod";

export const accountIdSchema = z.object({
  accountId: z.number().int().positive(),
});

export const createAccountSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  isPractice: z.boolean().default(false),
});

export const renameAccountSchema = createAccountSchema.extend({
  accountId: z.number().int().positive(),
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

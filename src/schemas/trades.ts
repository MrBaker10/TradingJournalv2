import * as z from "zod";

export const sessionEnum = z.enum(["Asia", "London", "NY-AM", "NY-PM"]);
export const setupTypeEnum = z.enum([
  "Break & Retest",
  "Continuation",
  "Stack Levels",
  "Reversal",
  "Others",
]);
export const entryModelEnum = z.enum([
  "iFVG",
  "Wick Flip",
  "Engulfing",
  "FVG",
  "CISD",
  "Other",
]);
export const resultEnum = z.enum(["Win", "Loss", "Breakeven", "Scratch"]);
export const gradeEnum = z.enum(["A", "B", "C", "D", "F"]);
export const feltEnum = z.enum([
  "Confident",
  "Anxious",
  "FOMO",
  "Bored",
  "Frustrated",
  "Neutral",
  "Disciplined",
]);
export const directionEnum = z.enum(["long", "short"]);

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");
const timeField = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time");
const priceField = z.number().positive();

const sharedFields = {
  tradeDate: dateField,
  instrumentId: z.number().int().positive(),
  direction: directionEnum,
  entryTime: timeField,
  entryPrice: priceField,
  stopPrice: priceField.optional(),
  session: sessionEnum.optional(),
  setupType: setupTypeEnum.optional(),
  entryModel: entryModelEnum.optional(),
  confluenceTagIds: z.array(z.number().int().positive()).default([]),
  mistakeTagIds: z.array(z.number().int().positive()).default([]),
  mfeR: z.number().optional(),
  maeR: z.number().optional(),
  notes: z.string().max(4000).optional(),
  felt: feltEnum.optional(),
  grade: gradeEnum.optional(),
};

// Missed setup: nothing was executed, so exit/contracts/P&L/result/account
// assignment don't apply (confirmed with Sascha — see current-feature.md).
export const missedSetupSchema = z.object({
  taken: z.literal(false),
  ...sharedFields,
});

export const takenTradeSchema = z
  .object({
    taken: z.literal(true),
    ...sharedFields,
    exitTime: timeField,
    exitPrice: priceField,
    contracts: z.number().int().positive(),
    pnlOverride: z.number().optional(),
    result: resultEnum.optional(),
    byTheBook: z.boolean().optional(),
    postExitMfeR: z.number().optional(),
    accountIds: z
      .array(z.number().int().positive())
      .min(1, "Select at least one account"),
  })
  .superRefine((data, ctx) => {
    // Post-exit MFE is shown only when a stop price is set — cannot be
    // derived without one (project-overview.md).
    if (data.postExitMfeR !== undefined && data.stopPrice === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["postExitMfeR"],
        message: "Post-exit MFE requires a stop price",
      });
    }
  });

export const createTradeSchema = z.discriminatedUnion("taken", [
  missedSetupSchema,
  takenTradeSchema,
]);

export type CreateTradeInput = z.infer<typeof createTradeSchema>;

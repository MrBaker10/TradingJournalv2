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

const MAX_URL_LENGTH = 2048;

// "https scheme only, parsed with the URL API, length capped. No http, no
// javascript:, no data:" (coding-standards.md, External links on trades) —
// checking protocol === "https:" against a value the URL API could parse
// rejects all three in one step, since none of them ever parse to "https:".
export const httpsUrlSchema = z
  .string()
  .max(MAX_URL_LENGTH, "Link is too long")
  .refine((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "Only https:// links are allowed");

export const tradeLinkSchema = z.object({
  url: httpsUrlSchema,
  label: z.string().trim().max(200).optional(),
});

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
  // Either branch may have links, taken or missed alike — project-overview.md
  // doesn't restrict this to taken trades the way account assignment is.
  links: z.array(tradeLinkSchema).default([]),
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

const tradeIdSchema = z.object({
  tradeId: z.number().int().positive(),
});

export const addTradeLinkSchema = tradeIdSchema.extend({
  url: httpsUrlSchema,
  label: z.string().trim().max(200).optional(),
});

export const deleteTradeLinkSchema = tradeIdSchema.extend({
  linkId: z.number().int().positive(),
});

export const deleteTradeScreenshotSchema = tradeIdSchema.extend({
  screenshotId: z.number().int().positive(),
});

import * as z from "zod";

export const CHECKLIST_PHASES = ["premarket", "trading", "review"] as const;
export const CHECKLIST_PHASE_LABELS = {
  premarket: "Pre-market",
  trading: "Trading",
  review: "Day review",
};

export const checklistItemSchema = z.object({
  phase: z.enum(CHECKLIST_PHASES),
  text: z
    .string()
    .trim()
    .min(1, "Enter a step.")
    .max(120, "Use 120 characters or fewer."),
});
export type ChecklistItemInput = z.infer<typeof checklistItemSchema>;

export const MAX_CHECKLIST_ITEMS_PER_PHASE = 20;
export const CHECKLIST_PHASE_FULL = "Each phase can have up to 20 steps.";

export const checklistItemIdSchema = z.object({
  itemId: z.number().int().positive(),
});
export const renameChecklistItemSchema = checklistItemIdSchema.extend({
  text: checklistItemSchema.shape.text,
});
export const CHECKLIST_SAVE_FAILED =
  "Couldn't save the checklist. Your text is still here — try again.";

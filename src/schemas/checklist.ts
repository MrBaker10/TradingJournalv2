import * as z from "zod";
import { messageKey } from "../lib/i18n/message-keys.ts";

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
    .min(1, messageKey("validation.checklistStepRequired"))
    .max(120, messageKey("validation.checklistStepTooLong")),
});
export type ChecklistItemInput = z.infer<typeof checklistItemSchema>;

export const MAX_CHECKLIST_ITEMS_PER_PHASE = 20;
export const CHECKLIST_PHASE_FULL = messageKey("validation.checklistPhaseFull");

export const checklistItemIdSchema = z.object({
  itemId: z.number().int().positive(),
});
export const renameChecklistItemSchema = checklistItemIdSchema.extend({
  text: checklistItemSchema.shape.text,
});
export const moveChecklistItemSchema = checklistItemIdSchema.extend({
  direction: z.enum(["up", "down"]),
});
export type ChecklistMoveDirection = z.infer<
  typeof moveChecklistItemSchema
>["direction"];

// Ticks always apply to the user's today; the client never supplies a date.
export const setChecklistCheckSchema = checklistItemIdSchema.extend({
  checked: z.boolean(),
});
export const CHECKLIST_MOVE_FAILED = messageKey("errors.checklistMoveFailed");
export const CHECKLIST_TICK_FAILED = messageKey("errors.checklistTickFailed");
export const CHECKLIST_SAVE_FAILED = messageKey("errors.checklistSaveFailed");

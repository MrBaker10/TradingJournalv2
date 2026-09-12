import * as z from "zod";

const MAX_NOTE_LENGTH = 4000;

/**
 * Design.md §4.6 and §7: an empty plan is the one error this card has, and it
 * says what the field is for instead of that it is required. The 20-character
 * mark is live feedback while typing, not a rule — a short plan still saves.
 */
export const PLAN_HINT_LENGTH = 20;

// No date field: the card writes today and only today, and which day that is
// comes from the user's timezone on the server, never from the client.
export const saveDailyNoteSchema = z.object({
  premarketPlan: z
    .string()
    .trim()
    .min(
      1,
      "Write your levels first — this is what plan adherence checks against.",
    )
    .max(MAX_NOTE_LENGTH),
  // Optional by design: the review is written at the end of the day, hours
  // after the plan. An empty one is stored as NULL, not as "".
  eodReview: z.string().trim().max(MAX_NOTE_LENGTH).optional(),
});

export type SaveDailyNoteInput = z.infer<typeof saveDailyNoteSchema>;

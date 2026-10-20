import * as z from "zod";
import { isReviewWeekStart } from "../domain/review-week.ts";

/** Also the textareas' `maxLength`, so the form cannot exceed it. */
export const MAX_REVIEW_FIELD_LENGTH = 4000;

/** Shown by the form and returned by the action when a save fails. */
export const WEEKLY_REVIEW_SAVE_FAILED =
  "Couldn't save. Your text is still here — try again.";

/** Returned for a week start that is no Sunday — only a tampered request. */
export const WEEKLY_REVIEW_INVALID_WEEK =
  "This isn't a review week. Reload the page and try again.";

/** Returned for a week that has not begun yet in the user's calendar. */
export const WEEKLY_REVIEW_FUTURE_WEEK =
  "This week hasn't started yet. Pick the current week or an earlier one.";

// Every field is optional: a review can start with one line. An empty field is
// stored as NULL, not as "" — the action turns blanks into null.
const reviewField = z.string().trim().max(MAX_REVIEW_FIELD_LENGTH);

// The week comes from the client so a save lands on the week the form was
// opened for, even when the user's midnight passes while typing. That no
// future week is written is the action's check against today, not this
// schema's.
export const saveWeeklyReviewSchema = z.object({
  weekStart: z.iso
    .date(WEEKLY_REVIEW_INVALID_WEEK)
    .refine(isReviewWeekStart, WEEKLY_REVIEW_INVALID_WEEK),
  whatWorked: reviewField,
  whatDidNotWork: reviewField,
  focusNextWeek: reviewField,
});

export type SaveWeeklyReviewInput = z.infer<typeof saveWeeklyReviewSchema>;

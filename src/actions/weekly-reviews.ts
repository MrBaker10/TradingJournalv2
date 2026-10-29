"use server";

import { upsertWeeklyReview } from "@/db/queries/weekly-reviews";
import { reviewWeekPosition } from "@/domain/review-week";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { revalidatePage } from "@/lib/i18n/revalidate";
import { todayInTimeZone } from "@/lib/time";
import {
  saveWeeklyReviewSchema,
  WEEKLY_REVIEW_FUTURE_WEEK,
  WEEKLY_REVIEW_SAVE_FAILED,
} from "@/schemas/weekly-reviews";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function blankToNull(value: string): string | null {
  return value === "" ? null : value;
}

/**
 * Saves the weekly review of the week the form was opened for. A past week is
 * accepted, so a review typed across the user's Saturday midnight still lands
 * in the week it was written for; a week that has not begun yet is refused.
 * Today is the user's own calendar day. No badge sync: the weekly review
 * feeds no score, streak or badge (spec, Out of Scope).
 */
export async function saveWeeklyReview(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = saveWeeklyReviewSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const user = await getCurrentUser();
    const today = todayInTimeZone(user.timezone);

    if (reviewWeekPosition(parsed.data.weekStart, today) === "future") {
      return { success: false, error: WEEKLY_REVIEW_FUTURE_WEEK };
    }

    await upsertWeeklyReview(user.id, parsed.data.weekStart, {
      whatWorked: blankToNull(parsed.data.whatWorked),
      whatDidNotWork: blankToNull(parsed.data.whatDidNotWork),
      focusNextWeek: blankToNull(parsed.data.focusNextWeek),
    });

    revalidatePage("/progress/weekly-review");
    return { success: true, data: null };
  } catch (error) {
    console.error("Weekly review save failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { success: false, error: WEEKLY_REVIEW_SAVE_FAILED };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { upsertDailyNote } from "@/db/queries/daily-notes";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { todayInTimeZone } from "@/lib/time";
import { saveDailyNoteSchema } from "@/schemas/daily-notes";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Saves the plan and, when it was filled in, the end-of-day review for one
 * day. The date is not taken from the client: the card only ever writes
 * today, and today is the user's own calendar day.
 */
export async function saveDailyNote(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = saveDailyNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const user = await getCurrentUser();
    const today = todayInTimeZone(user.timezone);

    await upsertDailyNote(user.id, today, {
      premarketPlan: parsed.data.premarketPlan,
      eodReview: parsed.data.eodReview ? parsed.data.eodReview : null,
    });

    revalidatePath("/dashboard");
    return { success: true, data: null };
  } catch {
    return {
      success: false,
      error: "Couldn't save. Your text is still here — try again.",
    };
  }
}

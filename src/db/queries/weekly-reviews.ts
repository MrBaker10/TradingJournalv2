import { and, eq, sql } from "drizzle-orm";
import type { IsoDate } from "../../domain/streak.ts";
import { db } from "../index.ts";
import { weeklyReviews } from "../schema/weekly-reviews.ts";

export interface WeeklyReview {
  weekStart: IsoDate;
  whatWorked: string | null;
  whatDidNotWork: string | null;
  focusNextWeek: string | null;
}

export type WeeklyReviewWrite = Omit<WeeklyReview, "weekStart">;

export async function getWeeklyReview(
  userId: number,
  weekStart: IsoDate,
  executor: Pick<typeof db, "select"> = db,
): Promise<WeeklyReview | null> {
  const [review] = await executor
    .select({
      weekStart: weeklyReviews.weekStart,
      whatWorked: weeklyReviews.whatWorked,
      whatDidNotWork: weeklyReviews.whatDidNotWork,
      focusNextWeek: weeklyReviews.focusNextWeek,
    })
    .from(weeklyReviews)
    .where(
      and(
        eq(weeklyReviews.userId, userId),
        eq(weeklyReviews.weekStart, weekStart),
      ),
    )
    .limit(1);

  return review ?? null;
}

/**
 * Saving again replaces all three fields: the form always sends the whole
 * review, so a field the user cleared is cleared here too. The unique index
 * on (user_id, week_start) is what makes this one row per week.
 */
export async function upsertWeeklyReview(
  userId: number,
  weekStart: IsoDate,
  values: WeeklyReviewWrite,
  executor: Pick<typeof db, "insert"> = db,
): Promise<void> {
  await executor
    .insert(weeklyReviews)
    .values({ userId, weekStart, ...values })
    .onConflictDoUpdate({
      target: [weeklyReviews.userId, weeklyReviews.weekStart],
      set: { ...values, updatedAt: sql`now()` },
    });
}

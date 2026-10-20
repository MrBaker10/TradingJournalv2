import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
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

/**
 * A row whose three fields were all cleared is no review, like an empty
 * `eod_review` is none (daily-notes.ts, hasEodReview). The action stores
 * blanks as NULL, so NULL is the only empty value to look for.
 */
const hasReviewText = sql<boolean>`coalesce(
  ${weeklyReviews.whatWorked},
  ${weeklyReviews.whatDidNotWork},
  ${weeklyReviews.focusNextWeek}
) is not null`;

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

/** The week starts in `from`..`to` (inclusive) that carry a review, oldest first. */
export async function listReviewedWeekStarts(
  userId: number,
  from: IsoDate,
  to: IsoDate,
  executor: Pick<typeof db, "select"> = db,
): Promise<IsoDate[]> {
  const rows = await executor
    .select({ weekStart: weeklyReviews.weekStart })
    .from(weeklyReviews)
    .where(
      and(
        eq(weeklyReviews.userId, userId),
        gte(weeklyReviews.weekStart, from),
        lte(weeklyReviews.weekStart, to),
        hasReviewText,
      ),
    )
    .orderBy(asc(weeklyReviews.weekStart));

  return rows.map((row) => row.weekStart);
}

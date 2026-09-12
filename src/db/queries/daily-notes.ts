import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { IsoDate } from "../../domain/streak.ts";
import { monthRangeOf } from "../../lib/time.ts";
import { db } from "../index.ts";
import { dailyNotes } from "../schema/daily-notes.ts";

/** A row with an empty string in it is not a review. */
export const hasEodReview = sql<boolean>`(
  ${dailyNotes.eodReview} is not null and ${dailyNotes.eodReview} <> ''
)`;

export interface DailyNote {
  noteDate: IsoDate;
  premarketPlan: string | null;
  eodReview: string | null;
}

export async function getDailyNote(
  userId: number,
  date: IsoDate,
): Promise<DailyNote | null> {
  const [note] = await db
    .select({
      noteDate: dailyNotes.noteDate,
      premarketPlan: dailyNotes.premarketPlan,
      eodReview: dailyNotes.eodReview,
    })
    .from(dailyNotes)
    .where(and(eq(dailyNotes.userId, userId), eq(dailyNotes.noteDate, date)))
    .limit(1);

  return note ?? null;
}

/** The dates of `month` that carry a non-empty end-of-day review. */
export async function listMonthReviewDates(
  userId: number,
  month: string,
): Promise<IsoDate[]> {
  const range = monthRangeOf(month);

  const rows = await db
    .select({ noteDate: dailyNotes.noteDate })
    .from(dailyNotes)
    .where(
      and(
        eq(dailyNotes.userId, userId),
        gte(dailyNotes.noteDate, range.from),
        lte(dailyNotes.noteDate, range.to),
        hasEodReview,
      ),
    );

  return rows.map((row) => row.noteDate);
}

/**
 * Writing the plan and writing the review later are two writes to the same
 * row, which is what the unique index on (user_id, note_date) is for. Only
 * the fields actually passed are touched, so saving a review never blanks the
 * plan written that morning.
 */
export async function upsertDailyNote(
  userId: number,
  date: IsoDate,
  values: { premarketPlan?: string | null; eodReview?: string | null },
): Promise<void> {
  await db
    .insert(dailyNotes)
    .values({
      userId,
      noteDate: date,
      premarketPlan: values.premarketPlan ?? null,
      eodReview: values.eodReview ?? null,
    })
    .onConflictDoUpdate({
      target: [dailyNotes.userId, dailyNotes.noteDate],
      set: {
        ...(values.premarketPlan !== undefined
          ? { premarketPlan: values.premarketPlan }
          : {}),
        ...(values.eodReview !== undefined
          ? { eodReview: values.eodReview }
          : {}),
        updatedAt: sql`now()`,
      },
    });
}

import { eq, TransactionRollbackError } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../../index.ts";
import { users } from "../../schema/users.ts";
import { weeklyReviews } from "../../schema/weekly-reviews.ts";
import { getWeeklyReview, upsertWeeklyReview } from "../weekly-reviews.ts";

// Drives the weekly-reviews query module against real Postgres, inside a
// rolled-back transaction like the other query tests.

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function fixture(
  body: (tx: Tx, userId: number, otherUserId: number) => Promise<void>,
) {
  try {
    await db.transaction(async (tx) => {
      const [user, other] = await tx
        .insert(users)
        .values([
          {
            username: "weekly-review-test",
            email: "weekly-review-test@users.invalid",
            displayName: "Weekly review test",
            timezone: "Europe/Berlin",
          },
          {
            username: "weekly-review-test-other",
            email: "weekly-review-test-other@users.invalid",
            displayName: "Weekly review test other",
            timezone: "Europe/Berlin",
          },
        ])
        .returning({ id: users.id });
      await body(tx, user.id, other.id);
      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }
}

const WEEK = "2026-10-18";

describe("weekly reviews", () => {
  it("reads back what was saved", async () => {
    await fixture(async (tx, userId) => {
      await upsertWeeklyReview(
        userId,
        WEEK,
        {
          whatWorked: "Waited for the retest",
          whatDidNotWork: null,
          focusNextWeek: "No trades before 9:45",
        },
        tx,
      );

      expect(await getWeeklyReview(userId, WEEK, tx)).toEqual({
        weekStart: WEEK,
        whatWorked: "Waited for the retest",
        whatDidNotWork: null,
        focusNextWeek: "No trades before 9:45",
      });
    });
  });

  it("returns null for a week without a review", async () => {
    await fixture(async (tx, userId) => {
      expect(await getWeeklyReview(userId, WEEK, tx)).toBeNull();
    });
  });

  it("replaces the week's review on a second save instead of adding one", async () => {
    await fixture(async (tx, userId) => {
      await upsertWeeklyReview(
        userId,
        WEEK,
        {
          whatWorked: "First draft",
          whatDidNotWork: "Chased the open",
          focusNextWeek: null,
        },
        tx,
      );
      await upsertWeeklyReview(
        userId,
        WEEK,
        {
          whatWorked: "Second draft",
          whatDidNotWork: null,
          focusNextWeek: "One setup only",
        },
        tx,
      );

      const rows = await tx
        .select()
        .from(weeklyReviews)
        .where(eq(weeklyReviews.userId, userId));
      expect(rows).toHaveLength(1);
      expect(await getWeeklyReview(userId, WEEK, tx)).toEqual({
        weekStart: WEEK,
        whatWorked: "Second draft",
        whatDidNotWork: null,
        focusNextWeek: "One setup only",
      });
    });
  });

  it("keeps another user's review invisible", async () => {
    await fixture(async (tx, userId, otherUserId) => {
      await upsertWeeklyReview(
        otherUserId,
        WEEK,
        { whatWorked: "Theirs", whatDidNotWork: null, focusNextWeek: null },
        tx,
      );

      expect(await getWeeklyReview(userId, WEEK, tx)).toBeNull();
    });
  });
});

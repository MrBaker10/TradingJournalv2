import { eq, sql } from "drizzle-orm";
import type { IsoDate } from "../../domain/streak.ts";
import { db } from "../index.ts";
import { userBadges } from "../schema/badges.ts";
import { trades } from "../schema/trades.ts";
import { users } from "../schema/users.ts";
import {
  type BadgeCounters,
  getBadgeCounters,
  type ReadExecutor,
} from "./dashboard.ts";
import { getBestMonthlyScore } from "./monthly-scores.ts";
import { scopeWhere } from "./scope.ts";
import { listReviewedWeekStarts } from "./weekly-reviews.ts";

// What /progress reads beside the streak and the score. Every figure here is
// a **count aggregate** over the user's own rows; none follows the account
// selector, because streak, score and badges see real accounts only.

export interface ProgressCounters extends BadgeCounters {
  /** The best frozen month, 0 before the first month closes. */
  bestMonthlyScore: number;
  /** Review weeks in the window that carry a review, oldest first. */
  reviewedWeeks: IsoDate[];
}

/**
 * The numbers behind the badge progress and the review card: the counters
 * the badge sync reads (src/lib/badges/sync.ts), the best frozen monthly
 * score and the reviewed weeks between `weeks.from` and `weeks.to`. The same
 * queries as the sync, so a badge's progress and its award never disagree.
 */
export async function getProgressCounters(
  userId: number,
  weeks: { from: IsoDate; to: IsoDate },
  executor: ReadExecutor = db,
): Promise<ProgressCounters> {
  const [counters, bestMonthlyScore, reviewedWeeks] = await Promise.all([
    getBadgeCounters(userId, executor),
    getBestMonthlyScore(userId, executor),
    listReviewedWeekStarts(userId, weeks.from, weeks.to, executor),
  ]);
  return { ...counters, bestMonthlyScore, reviewedWeeks };
}

/**
 * `users.badges_seen_at` as a scalar subquery, `-infinity` when the user has
 * never opened /progress. The id is bound as a parameter against an alias, so
 * nothing correlates with the outer query (see `bumpStreakExpression`).
 */
function progressSeenAt(userId: number) {
  return sql`coalesce(
    (select seen_users.badges_seen_at from ${users} as seen_users
     where seen_users.id = ${userId}),
    '-infinity'::timestamptz
  )`;
}

/**
 * True when an entry was logged or a badge earned since the user last opened
 * /progress (`users.badges_seen_at`): the page then plays its process moment
 * once. Like the dashboard's streak bump, "logged since" is the trigger, but
 * only entries the streak can see count: a trade on practice accounts alone
 * is left out, a missed setup is in. The comparison stays in SQL, where both
 * sides are timestamptz; bool_or over no rows is NULL, hence the coalesce.
 */
export async function hasProgressMoment(
  userId: number,
  executor: ReadExecutor = db,
): Promise<boolean> {
  const [[entry], [badge]] = await Promise.all([
    executor
      .select({
        due: sql<boolean>`coalesce(bool_or(${trades.createdAt} > ${progressSeenAt(userId)}), false)`,
      })
      .from(trades)
      .where(scopeWhere({ userId, selectedAccountId: null })),
    executor
      .select({
        due: sql<boolean>`coalesce(bool_or(${userBadges.earnedAt} > ${progressSeenAt(userId)}), false)`,
      })
      .from(userBadges)
      .where(eq(userBadges.userId, userId)),
  ]);
  return entry.due || badge.due;
}

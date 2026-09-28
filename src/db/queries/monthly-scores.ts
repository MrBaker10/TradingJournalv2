import { and, desc, eq, sql } from "drizzle-orm";
import type { ConsistencyScore } from "../../domain/consistency.ts";
import { db } from "../index.ts";
import { monthlyScores } from "../schema/monthly-scores.ts";

// Frozen monthly consistency scores (P2.6). Written only by the month-close
// job, read by /progress and by the badge sync for `score_90`.

export type MonthlyScoreExecutor = Pick<typeof db, "select" | "insert">;

export interface MonthlyScoreRow {
  /** `YYYY-MM`, the user's own calendar. */
  month: string;
  score: number;
  /** The exact parts as Postgres returns `numeric`: strings, four decimals. */
  showingUp: string;
  completeness: string;
  planAdherence: string;
  reviewHabit: string;
}

export async function monthlyScoreExists(
  userId: number,
  month: string,
  executor: MonthlyScoreExecutor = db,
): Promise<boolean> {
  const [row] = await executor
    .select({ month: monthlyScores.month })
    .from(monthlyScores)
    .where(
      and(eq(monthlyScores.userId, userId), eq(monthlyScores.month, month)),
    )
    .limit(1);
  return row !== undefined;
}

/**
 * Writes the month, over an existing row too. Whether a run may overwrite is
 * decided before this is called (src/domain/month-close.ts, shouldWrite) —
 * this only makes a repeated write replace rather than duplicate.
 *
 * The parts go in as they come out of the domain module; Postgres rounds them
 * to the column's four decimals. `score` is already rounded from the exact
 * parts, so it never drifts from what /progress showed live.
 */
export async function upsertMonthlyScore(
  userId: number,
  month: string,
  score: ConsistencyScore,
  executor: MonthlyScoreExecutor = db,
): Promise<void> {
  const parts = {
    score: score.score,
    showingUp: String(score.showingUp),
    completeness: String(score.completeness),
    planAdherence: String(score.planAdherence),
    reviewHabit: String(score.reviewHabit),
  };

  await executor
    .insert(monthlyScores)
    .values({ userId, month, ...parts })
    .onConflictDoUpdate({
      target: [monthlyScores.userId, monthlyScores.month],
      set: { ...parts, computedAt: sql`now()` },
    });
}

/** Every frozen month of the user, newest first. */
export async function listMonthlyScores(
  userId: number,
  executor: Pick<typeof db, "select"> = db,
): Promise<MonthlyScoreRow[]> {
  return executor
    .select({
      month: monthlyScores.month,
      score: monthlyScores.score,
      showingUp: monthlyScores.showingUp,
      completeness: monthlyScores.completeness,
      planAdherence: monthlyScores.planAdherence,
      reviewHabit: monthlyScores.reviewHabit,
    })
    .from(monthlyScores)
    .where(eq(monthlyScores.userId, userId))
    .orderBy(desc(monthlyScores.month));
}

/** The best frozen score the user has, 0 before the first month closes. */
export async function getBestMonthlyScore(
  userId: number,
  executor: Pick<typeof db, "select"> = db,
): Promise<number> {
  const [row] = await executor
    .select({
      best: sql<number>`coalesce(max(${monthlyScores.score}), 0)::int`,
    })
    .from(monthlyScores)
    .where(eq(monthlyScores.userId, userId));
  return row?.best ?? 0;
}

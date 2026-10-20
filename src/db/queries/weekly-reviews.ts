import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { reviewWeekRange } from "../../domain/review-week.ts";
import type { IsoDate } from "../../domain/streak.ts";
import { db } from "../index.ts";
import { instruments } from "../schema/instruments.ts";
import { mistakeTags, tradeMistakes, trades } from "../schema/trades.ts";
import { weeklyReviews } from "../schema/weekly-reviews.ts";
import {
  moneyContribution,
  type QueryScope,
  scopeConditions,
  toNumber,
} from "./scope.ts";

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

export interface WeekMistake {
  label: string;
  /** Entries tagged with it — a copy trade is one entry. */
  count: number;
}

export interface WeekSummary {
  /** Trading days with at least one entry, taken or missed. */
  loggedDays: number;
  takenTrades: number;
  byTheBookTrades: number;
  missedSetups: number;
  /** At most three, most frequent first. */
  topMistakes: WeekMistake[];
  /**
   * Integer cents in the scope's display currency, net of commission, each
   * trade counted once per real account it was copied onto — the dashboard's
   * Net P&L for this week. Shown, never celebrated.
   */
  netPnlCents: number;
}

/**
 * Whose week, and the "All accounts" display currency (USD when left out).
 * No selected account: the summary never follows the switcher.
 */
export type WeekScope = Pick<QueryScope, "userId" | "currency">;

const TOP_MISTAKE_COUNT = 3;

// The trading day an entry belongs to, in SQL: a Sunday-dated entry lands on
// Monday, as in the streak and the consistency score (streak.ts,
// toTradingDay). A Saturday never reaches this — the week runs Sunday to
// Friday, so the date range already leaves it out.
const tradingDay = sql`case when extract(isodow from ${trades.tradeDate}) = 7
  then ${trades.tradeDate} + 1 else ${trades.tradeDate} end`;

/**
 * One review week over all real accounts, the read-only summary beside the
 * review. It follows "All accounts", never the switcher: the review belongs
 * to the user, not to an account. Practice accounts drop out through the
 * scope. Always computed from the trades, so editing a trade changes a past
 * week's summary too. Two kinds of aggregate in one result:
 *
 * - **Count aggregate**: logged days, taken, by the book, missed setups and
 *   mistakes. A trade counts once however many accounts it was copied onto.
 * - **Money aggregate**: `netPnlCents`, multiplied by the real accounts of
 *   each trade through `moneyContribution`, net of commission, in the scope's
 *   display currency.
 *
 * Logged days count every entry, backfills included, like the "days logged"
 * of the consistency score; only the streak applies the 48-hour window.
 * By the book counts taken trades only, as on the dashboard (getCountMetrics).
 * Mistakes count every entry in scope, missed setups included: hesitating on
 * a valid setup is a mistake a trader tags, and a weekly review should see it.
 */
export async function getWeekSummary(
  weekScope: WeekScope,
  weekStart: IsoDate,
  executor: Pick<typeof db, "select"> = db,
): Promise<WeekSummary> {
  const scope: QueryScope = { ...weekScope, selectedAccountId: null };
  const inWeek = scopeConditions(scope, reviewWeekRange(weekStart));

  const [[counts], mistakes, [money]] = await Promise.all([
    executor
      .select({
        loggedDays: sql<number>`count(distinct ${tradingDay})::int`,
        takenTrades: sql<number>`count(*) filter (where ${trades.taken})::int`,
        byTheBookTrades: sql<number>`count(*) filter (where ${trades.taken} and ${trades.byTheBook})::int`,
        missedSetups: sql<number>`count(*) filter (where ${trades.taken} = false)::int`,
      })
      .from(trades)
      .where(and(...inWeek)),
    executor
      .select({
        label: mistakeTags.label,
        count: sql<number>`count(distinct ${trades.id})::int`,
      })
      .from(trades)
      .innerJoin(tradeMistakes, eq(tradeMistakes.tradeId, trades.id))
      .innerJoin(mistakeTags, eq(mistakeTags.id, tradeMistakes.mistakeTagId))
      .where(and(...inWeek))
      .groupBy(mistakeTags.id, mistakeTags.label)
      .orderBy(desc(sql`count(distinct ${trades.id})`), asc(mistakeTags.label))
      .limit(TOP_MISTAKE_COUNT),
    // The money multiplier lives in `moneyContribution` and nowhere else, so
    // this sum and the dashboard's Net P&L cannot drift apart. A missed setup
    // has no P&L and drops out of the sum on its own.
    executor
      .select({
        netPnlCents: sql<string>`coalesce(sum(${moneyContribution(scope)}), 0)::bigint`,
      })
      .from(trades)
      .innerJoin(instruments, eq(trades.instrumentId, instruments.id))
      .where(and(...inWeek)),
  ]);

  return {
    ...counts,
    topMistakes: mistakes,
    netPnlCents: toNumber(money.netPnlCents),
  };
}

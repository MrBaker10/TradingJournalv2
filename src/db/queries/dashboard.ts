import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { ScoreDay, ScoreEntry } from "../../domain/consistency.ts";
import type { IsoDate } from "../../domain/streak.ts";
import { monthRangeOf } from "../../lib/time.ts";
import { db } from "../index.ts";
import { dailyNotes } from "../schema/daily-notes.ts";
import { instruments } from "../schema/instruments.ts";
import {
  tradeConfluences,
  tradeLinks,
  tradeScreenshots,
  trades,
} from "../schema/trades.ts";
import { users } from "../schema/users.ts";
import { hasEodReview, listMonthReviewDates } from "./daily-notes.ts";
import {
  moneyContribution,
  moneyWeight,
  type QueryScope,
  ratioCents,
  scopeConditions,
  toNumber,
} from "./scope.ts";
import { hasRealAccount, rMultipleSortKey, tradePnlCents } from "./trades.ts";

// Every figure on the dashboard comes from this file, and every exported
// function says in its header whether it is a **money aggregate** (multiplies
// by the assigned real accounts) or a **count aggregate** (does not). Getting
// that wrong misstates P&L silently — coding-standards.md, Money.
//
// The account scope itself — the practice filter, the multiplier and the
// per-account branch — lives in ./scope.ts, shared with the analytics queries.

/** The dashboard's name for the shared scope. Same shape, same rules. */
export type DashboardScope = QueryScope;

export interface MonthMoneyMetrics {
  netPnlCents: number;
  grossWinCents: number;
  /** Magnitude, always >= 0. */
  grossLossCents: number;
  avgWinnerCents: number | null;
  avgLoserCents: number | null;
  expectancyCents: number | null;
  /** Gross win over gross loss. null when the month has no loss to divide by. */
  profitFactor: number | null;
}

/**
 * **Money aggregate.** Net P&L and everything derived from it for one month.
 *
 * Winner and loser are decided by the derived P&L sign, not by the optional
 * `trades.result` field: `result` is user-set and may be empty, and a win
 * rate that disagrees with Net P&L is worse than no win rate.
 *
 * The three averages and the profit factor are ratios of two aggregates, not
 * aggregates themselves — the sums are computed in SQL, the single division
 * happens here so the rounding back to whole cents stays visible.
 */
export async function getMonthMoneyMetrics(
  scope: DashboardScope,
  month: string,
): Promise<MonthMoneyMetrics> {
  const contribution = moneyContribution(scope);
  const weight = moneyWeight(scope);

  const [row] = await db
    .select({
      netPnlCents: sql<string>`coalesce(sum(${contribution}), 0)::bigint`,
      grossWinCents: sql<string>`coalesce(sum(${contribution}) filter (where ${tradePnlCents} > 0), 0)::bigint`,
      grossLossCents: sql<string>`abs(coalesce(sum(${contribution}) filter (where ${tradePnlCents} < 0), 0))::bigint`,
      winnerWeight: sql<number>`coalesce(sum(${weight}) filter (where ${tradePnlCents} > 0), 0)::int`,
      loserWeight: sql<number>`coalesce(sum(${weight}) filter (where ${tradePnlCents} < 0), 0)::int`,
      totalWeight: sql<number>`coalesce(sum(${weight}) filter (where ${tradePnlCents} is not null), 0)::int`,
    })
    .from(trades)
    .innerJoin(instruments, eq(trades.instrumentId, instruments.id))
    .where(and(...scopeConditions(scope, monthRangeOf(month))));

  const netPnlCents = toNumber(row.netPnlCents);
  const grossWinCents = toNumber(row.grossWinCents);
  const grossLossCents = toNumber(row.grossLossCents);

  return {
    netPnlCents,
    grossWinCents,
    grossLossCents,
    avgWinnerCents: ratioCents(grossWinCents, row.winnerWeight),
    avgLoserCents: ratioCents(-grossLossCents, row.loserWeight),
    expectancyCents: ratioCents(netPnlCents, row.totalWeight),
    profitFactor: grossLossCents > 0 ? grossWinCents / grossLossCents : null,
  };
}

export interface MonthCountMetrics {
  tradesLogged: number;
  missedSetups: number;
  byTheBook: number;
  /** Share of taken trades with a positive P&L, 0–1. null with no trades. */
  winRate: number | null;
  avgR: number | null;
}

/**
 * **Count aggregate.** A trade counts once, however many accounts it was
 * copy-traded onto — it was one decision.
 *
 * Missed setups are counted over the whole user, not the selected account:
 * they carry no account assignment at all, so there is nothing to filter them
 * by. They stay out of win rate and avg R, which are P&L figures.
 */
export async function getMonthCountMetrics(
  scope: DashboardScope,
  month: string,
): Promise<MonthCountMetrics> {
  const [row] = await db
    .select({
      tradesLogged: sql<number>`count(*) filter (where ${trades.taken})::int`,
      wins: sql<number>`count(*) filter (where ${tradePnlCents} > 0)::int`,
      missedSetups: sql<number>`count(*) filter (where ${trades.taken} = false)::int`,
      byTheBook: sql<number>`count(*) filter (where ${trades.taken} and ${trades.byTheBook})::int`,
      avgR: sql<
        string | null
      >`avg(${rMultipleSortKey}) filter (where ${trades.taken})`,
    })
    .from(trades)
    .innerJoin(instruments, eq(trades.instrumentId, instruments.id))
    .where(and(...scopeConditions(scope, monthRangeOf(month))));

  return {
    tradesLogged: row.tradesLogged,
    missedSetups: row.missedSetups,
    byTheBook: row.byTheBook,
    winRate: row.tradesLogged > 0 ? row.wins / row.tradesLogged : null,
    avgR: row.avgR === null ? null : Number(row.avgR),
  };
}

export interface DayTotal {
  date: IsoDate;
  /** Money aggregate: multiplied by the real accounts of each trade. */
  amountCents: number;
  /** Count aggregate: entries logged that day, taken and missed alike. */
  entryCount: number;
}

export interface MonthDayTotals {
  days: DayTotal[];
  /** Money aggregate: the month's largest peak-to-trough fall, >= 0. */
  maxDrawdownCents: number;
}

/**
 * **Money aggregate** for the amount, **count aggregate** for the number
 * beside it. One row per calendar day with at least one entry, which is what
 * Design.md §4.8 paints, plus Best day, Worst day, Today and Max drawdown.
 *
 * A day with nothing but missed setups is a real row with a zero amount: it
 * was journaled, and the calendar shows journaling.
 *
 * The drawdown runs over the month's own cumulative P&L and measures from the
 * higher of the running peak and zero, so a month that only ever falls has a
 * drawdown equal to its loss rather than none at all.
 */
export async function getMonthDayTotals(
  scope: DashboardScope,
  month: string,
): Promise<MonthDayTotals> {
  const contribution = moneyContribution(scope);

  const dayTotals = db.$with("day_totals").as(
    db
      .select({
        day: trades.tradeDate,
        amountCents: sql<string>`coalesce(sum(${contribution}), 0)::bigint`.as(
          "amount_cents",
        ),
        entryCount: sql<number>`count(*)::int`.as("entry_count"),
      })
      .from(trades)
      .innerJoin(instruments, eq(trades.instrumentId, instruments.id))
      .where(and(...scopeConditions(scope, monthRangeOf(month))))
      .groupBy(trades.tradeDate),
  );

  const cumulative = db.$with("cumulative").as(
    db
      .select({
        day: dayTotals.day,
        amountCents: dayTotals.amountCents,
        entryCount: dayTotals.entryCount,
        equityCents:
          sql<string>`sum(${dayTotals.amountCents}) over (order by ${dayTotals.day})`.as(
            "equity_cents",
          ),
      })
      .from(dayTotals),
  );

  const withPeak = db.$with("with_peak").as(
    db
      .select({
        day: cumulative.day,
        amountCents: cumulative.amountCents,
        entryCount: cumulative.entryCount,
        drawdownCents:
          sql<string>`greatest(max(${cumulative.equityCents}) over (order by ${cumulative.day}), 0) - ${cumulative.equityCents}`.as(
            "drawdown_cents",
          ),
      })
      .from(cumulative),
  );

  const rows = await db
    .with(dayTotals, cumulative, withPeak)
    .select({
      day: withPeak.day,
      amountCents: withPeak.amountCents,
      entryCount: withPeak.entryCount,
      // Same value on every row, like the window count in queries/trades.ts —
      // one round trip instead of a second statement.
      maxDrawdownCents: sql<string>`max(${withPeak.drawdownCents}) over ()`,
    })
    .from(withPeak)
    .orderBy(withPeak.day);

  return {
    days: rows.map((row) => ({
      date: row.day,
      amountCents: toNumber(row.amountCents),
      entryCount: row.entryCount,
    })),
    maxDrawdownCents: toNumber(rows[0]?.maxDrawdownCents),
  };
}

export interface StreakEntryDay {
  tradeDate: IsoDate;
  loggedAt: Date;
}

/**
 * **Count aggregate.** One row per logged calendar date over the whole
 * history, carrying the earliest `created_at` of that date — which is the
 * moment the 48h streak window is measured against.
 *
 * Real accounts only and no selected account: "streak, consistency score and
 * badges see real accounts only" (project-structure.md), so the switcher does
 * not move these. Grouping in SQL is also what keeps a copy-trade from
 * counting as several logged days.
 */
export async function getStreakEntryDays(
  userId: number,
): Promise<StreakEntryDay[]> {
  const rows = await db
    .select({
      tradeDate: trades.tradeDate,
      loggedAt: sql<Date>`min(${trades.createdAt})`,
    })
    .from(trades)
    .where(
      and(
        eq(trades.userId, userId),
        sql`(${trades.taken} = false or ${hasRealAccount})`,
      ),
    )
    .groupBy(trades.tradeDate)
    .orderBy(trades.tradeDate);

  return rows.map((row) => ({
    tradeDate: row.tradeDate,
    loggedAt: new Date(row.loggedAt),
  }));
}

/**
 * **Count aggregate.** One row per entry of the month with the flags
 * `calculateConsistencyScore` needs. The per-day averaging is the domain
 * module's job, not the query's — twenty trades in one day must count as one
 * day, and that rule lives in src/domain/consistency.ts.
 *
 * Real accounts only, like the streak.
 */
export async function getMonthScoreDays(
  userId: number,
  month: string,
): Promise<ScoreDay[]> {
  const range = monthRangeOf(month);

  const [entryRows, reviewDates] = await Promise.all([
    db
      .select({
        tradeDate: trades.tradeDate,
        taken: trades.taken,
        byTheBook: trades.byTheBook,
        hasNotes: sql<boolean>`(${trades.notes} is not null and ${trades.notes} <> '')`,
        hasGrade: sql<boolean>`(${trades.grade} is not null)`,
        hasFelt: sql<boolean>`(${trades.felt} is not null)`,
        hasConfluence: sql<boolean>`exists (
          select 1 from ${tradeConfluences}
          where ${tradeConfluences.tradeId} = ${trades.id}
        )`,
        hasScreenshotOrLink: sql<boolean>`(
          exists (
            select 1 from ${tradeScreenshots}
            where ${tradeScreenshots.tradeId} = ${trades.id}
          )
          or exists (
            select 1 from ${tradeLinks}
            where ${tradeLinks.tradeId} = ${trades.id}
          )
        )`,
      })
      .from(trades)
      .where(
        and(
          eq(trades.userId, userId),
          gte(trades.tradeDate, range.from),
          lte(trades.tradeDate, range.to),
          sql`(${trades.taken} = false or ${hasRealAccount})`,
        ),
      )
      .orderBy(trades.tradeDate),
    listMonthReviewDates(userId, month),
  ]);

  const reviewed = new Set(reviewDates);
  const byDate = new Map<IsoDate, ScoreEntry[]>();
  for (const row of entryRows) {
    const entry: ScoreEntry = {
      taken: row.taken,
      hasNotes: row.hasNotes,
      hasGrade: row.hasGrade,
      hasFelt: row.hasFelt,
      hasConfluence: row.hasConfluence,
      hasScreenshotOrLink: row.hasScreenshotOrLink,
      byTheBook: row.byTheBook ?? false,
    };
    const entries = byDate.get(row.tradeDate);
    if (entries) {
      entries.push(entry);
    } else {
      byDate.set(row.tradeDate, [entry]);
    }
  }

  // A day with a review but no entry is not a scoring day — the score
  // averages over days that carry entries (src/domain/consistency.ts).
  return [...byDate.entries()].map(([date, entries]) => ({
    date,
    entries,
    hasEodReview: reviewed.has(date),
  }));
}

export interface BadgeCounters {
  entriesLogged: number;
  reviewsWritten: number;
  byTheBookTrades: number;
}

/**
 * **Count aggregate**, over the whole history and over real accounts only.
 * Backfills count here, unlike in the streak: a late entry still happened.
 */
export async function getBadgeCounters(userId: number): Promise<BadgeCounters> {
  const [entries, reviews] = await Promise.all([
    db
      .select({
        entriesLogged: sql<number>`count(*)::int`,
        byTheBookTrades: sql<number>`count(*) filter (where ${trades.taken} and ${trades.byTheBook})::int`,
      })
      .from(trades)
      .where(
        and(
          eq(trades.userId, userId),
          sql`(${trades.taken} = false or ${hasRealAccount})`,
        ),
      ),
    db
      .select({ reviewsWritten: sql<number>`count(*)::int` })
      .from(dailyNotes)
      .where(and(eq(dailyNotes.userId, userId), hasEodReview)),
  ]);

  return {
    entriesLogged: entries[0].entriesLogged,
    byTheBookTrades: entries[0].byTheBookTrades,
    reviewsWritten: reviews[0].reviewsWritten,
  };
}

// --- Micro-rewards (Design.md §4.3 and §6) -------------------------------
// Neither of these is an aggregate. They read and write the two "already
// shown" markers on `users`, the same way badgesSeenAt works for the badge
// card on /progress.

export interface DashboardRewardState {
  /** A trade was logged since the dashboard was last opened — bump once. */
  bumpStreak: boolean;
  /** Highest streak milestone whose card has been shown; null if none has. */
  milestoneSeen: number | null;
}

/**
 * True when a trade was logged since the dashboard was last opened.
 *
 * Exported as a fragment so a test can evaluate it inside a transaction
 * against its own fixture rows, the way trades.test.ts uses `tradePnlCents`.
 *
 * The comparison stays in SQL, where both sides are timestamptz.
 *
 * It lived in TypeScript until review caught it: postgres hands the subquery
 * back as a **string**, `dashboardSeenAt` as a Date, and `string > Date`
 * coerces both toward number — the string becomes NaN and every comparison is
 * false. The bump then fired only while the column was still NULL, i.e.
 * exactly once per user, ever. Typing the template `sql<Date | null>` had
 * asserted a shape nothing checked.
 *
 * `-infinity` covers the never-visited case; the outer coalesce covers the
 * no-trades case, because max() over nothing is NULL and NULL > x is NULL.
 */
export function bumpStreakExpression(userId: number) {
  // The identifiers inside the subquery are spelled out against an alias
  // instead of interpolated. Drizzle qualifies a column reference in a WHERE
  // clause but not in a select list, and the unqualified version rendered as
  // `where "user_id" = "id"` — which postgres happily read as
  // trades.user_id = trades.id and matched arbitrary rows. Binding the id as
  // a parameter removes the correlation, and with it the ambiguity.
  return sql<boolean>`coalesce(
    (
      select max(bump_trades.created_at)
      from ${trades} as bump_trades
      where bump_trades.user_id = ${userId}
    ) > coalesce(${users.dashboardSeenAt}, '-infinity'::timestamptz),
    false
  )`;
}

export async function getDashboardRewardState(
  userId: number,
): Promise<DashboardRewardState> {
  const [row] = await db
    .select({
      milestoneSeen: users.streakMilestoneSeen,
      bumpStreak: bumpStreakExpression(userId),
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // No row can only mean the session points at a user that is gone. Nothing
  // to celebrate, and definitely nothing to invent.
  if (!row) return { bumpStreak: false, milestoneSeen: null };

  return { bumpStreak: row.bumpStreak, milestoneSeen: row.milestoneSeen };
}

export async function setDashboardSeenAt(userId: number): Promise<void> {
  await db
    .update(users)
    .set({ dashboardSeenAt: sql`now()` })
    .where(eq(users.id, userId));
}

export async function setStreakMilestoneSeen(
  userId: number,
  milestone: number,
): Promise<void> {
  await db
    .update(users)
    .set({ streakMilestoneSeen: milestone })
    .where(eq(users.id, userId));
}

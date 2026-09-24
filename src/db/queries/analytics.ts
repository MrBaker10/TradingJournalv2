import { and, eq, type SQL, sql } from "drizzle-orm";
import type {
  DimensionAggregateRow,
  DimensionId,
  MissedAggregateRow,
  MissedDimensionId,
} from "../../domain/analytics.ts";
import {
  bucketsFor,
  type ExcursionCount,
  type ExcursionKind,
  type Outcome,
} from "../../domain/execution.ts";
import { db } from "../index.ts";
import { accounts } from "../schema/accounts.ts";
import { instruments } from "../schema/instruments.ts";
import {
  confluenceTags,
  mistakeTags,
  tradeAccounts,
  tradeConfluences,
  tradeMistakes,
  trades,
} from "../schema/trades.ts";
import {
  type DateRange,
  moneyContribution,
  type QueryScope,
  scopeWhere,
  toNumber,
} from "./scope.ts";
import { holdMinutes, rMultipleSortKey, tradePnlCents } from "./trades.ts";

// The eleven analytics dimensions of project-overview.md §F, each as one
// GROUP BY, all eleven in a single UNION ALL statement. One round trip, no
// aggregation in TypeScript, and no query per row.
//
// Which of the two kinds each column is (coding-standards.md, Money):
//
// - `netPnlCents` is a **money aggregate**: it multiplies by the real accounts
//   a trade was copy-traded onto.
// - `trades`, `wins`, `rSum` and `rCount` are **count aggregates**: one
//   execution counts once, however many accounts it ran on.
//
// The one exception is the "By account" dimension, and it is not really an
// exception: there the join to `trade_accounts` already produces one row per
// assigned account, so the per-trade P&L is summed **unmultiplied**. Using the
// multiplied contribution there as well would count a three-account
// copy-trade nine times.
//
// Missed setups (`taken = false`) are excluded from every dimension table —
// they carry no exit, no P&L and no account, and project-overview.md keeps
// them out of every P&L, win rate and R figure. They have their own section
// at the bottom of this file, which touches no money at all.

/**
 * One bucket key per dimension, cast to text.
 *
 * The cast is what lets the eleven groupings share one UNION ALL: a set
 * operation needs one column type, and weekday and hour are numbers. Turning
 * them back into words is `formatBucketLabel` in src/domain/analytics.ts.
 *
 * `entry_time` is the user's chart clock and is read as it was typed — no
 * timezone is applied here, and none ever is (coding-standards.md, Time).
 */
const DIMENSION_KEYS = {
  account: sql`(${accounts.name})::text`,
  setupType: sql`(${trades.setupType})::text`,
  entryModel: sql`(${trades.entryModel})::text`,
  session: sql`(${trades.session})::text`,
  instrument: sql`(${instruments.symbol})::text`,
  weekday: sql`(extract(dow from ${trades.tradeDate})::int)::text`,
  hour: sql`(extract(hour from ${trades.entryTime})::int)::text`,
  confluence: sql`(${confluenceTags.label})::text`,
  felt: sql`(${trades.felt})::text`,
  grade: sql`(${trades.grade})::text`,
  mistake: sql`(${mistakeTags.label})::text`,
} satisfies Record<DimensionId, SQL>;

/** The dimensions that need nothing but the trade row and its instrument. */
const PLAIN_DIMENSIONS = [
  "setupType",
  "entryModel",
  "session",
  "instrument",
  "weekday",
  "hour",
  "felt",
  "grade",
] as const satisfies readonly DimensionId[];

/**
 * The select list every branch of the union shares, field for field.
 *
 * `contribution` is the only part that differs, and only for "By account" —
 * see the note at the top of the file.
 */
function dimensionFields(
  dimension: DimensionId,
  bucket: SQL,
  contribution: SQL<number | null>,
) {
  return {
    dimension: sql<DimensionId>`${dimension}::text`,
    bucket: sql<string | null>`${bucket}`,
    trades: sql<number>`count(*)::int`,
    wins: sql<number>`count(*) filter (where ${tradePnlCents} > 0)::int`,
    netPnlCents: sql<string>`coalesce(sum(${contribution}), 0)::bigint`,
    // NUMERIC out of postgres.js is a string, and it stays one until the
    // domain module divides it. `count` of the same expression is the
    // denominator that belongs to it: a trade without a stop price has no R
    // and must not drag the average toward zero.
    rSum: sql<string | null>`sum(${rMultipleSortKey})`,
    rCount: sql<number>`count(${rMultipleSortKey})::int`,
  };
}

/**
 * Whatever runs the statement: the shared client, or a transaction.
 *
 * Only `select` is needed, and nothing here writes. It exists so the money
 * rules below — the copy-trade multiplier and the practice exclusion — can be
 * pinned against real Postgres arithmetic inside a rolled-back transaction,
 * the same way `trades.test.ts` pins `tradePnlCents`. Production passes none.
 */
export type ReadExecutor = Pick<typeof db, "select">;

/** Ownership, date range, account scope — and taken trades only. */
function takenScope(scope: QueryScope, range?: DateRange) {
  return and(scopeWhere(scope, range), eq(trades.taken, true));
}

/**
 * Every dimension of the analytics page, in one statement.
 *
 * A bucket the trade left empty comes back as `null` and becomes the explicit
 * "Not set" row in the domain module. The two tag dimensions use a LEFT JOIN
 * for exactly that reason: a trade with no confluence at all is a finding, not
 * a row to drop.
 */
export async function getDimensionBreakdowns(
  scope: QueryScope,
  range?: DateRange,
  executor: ReadExecutor = db,
): Promise<DimensionAggregateRow[]> {
  const contribution = moneyContribution(scope);
  const where = takenScope(scope, range);

  /** A dimension that needs nothing but the trade row and its instrument. */
  function plainBranch(dimension: (typeof PLAIN_DIMENSIONS)[number]) {
    const key = DIMENSION_KEYS[dimension];
    return executor
      .select(dimensionFields(dimension, key, contribution))
      .from(trades)
      .innerJoin(instruments, eq(trades.instrumentId, instruments.id))
      .where(where)
      .groupBy(key);
  }

  // "By account" fans the trade out over its assigned accounts, so the
  // grouping itself is the multiplier and the money must not be multiplied a
  // second time. With no account selected only real accounts are joined; a
  // selected account is the one path allowed to read a practice account, and
  // it yields exactly one row.
  const accountKey = DIMENSION_KEYS.account;
  const accountBranch = executor
    .select(dimensionFields("account", accountKey, tradePnlCents))
    .from(trades)
    .innerJoin(instruments, eq(trades.instrumentId, instruments.id))
    .innerJoin(tradeAccounts, eq(tradeAccounts.tradeId, trades.id))
    .innerJoin(
      accounts,
      and(
        eq(accounts.id, tradeAccounts.accountId),
        scope.selectedAccountId === null
          ? eq(accounts.isPractice, false)
          : eq(accounts.id, scope.selectedAccountId),
      ),
    )
    .where(where)
    .groupBy(accountKey);

  const confluenceKey = DIMENSION_KEYS.confluence;
  const confluenceBranch = executor
    .select(dimensionFields("confluence", confluenceKey, contribution))
    .from(trades)
    .innerJoin(instruments, eq(trades.instrumentId, instruments.id))
    .leftJoin(tradeConfluences, eq(tradeConfluences.tradeId, trades.id))
    .leftJoin(
      confluenceTags,
      eq(confluenceTags.id, tradeConfluences.confluenceTagId),
    )
    .where(where)
    .groupBy(confluenceKey);

  const mistakeKey = DIMENSION_KEYS.mistake;
  const mistakeBranch = executor
    .select(dimensionFields("mistake", mistakeKey, contribution))
    .from(trades)
    .innerJoin(instruments, eq(trades.instrumentId, instruments.id))
    .leftJoin(tradeMistakes, eq(tradeMistakes.tradeId, trades.id))
    .leftJoin(mistakeTags, eq(mistakeTags.id, tradeMistakes.mistakeTagId))
    .where(where)
    .groupBy(mistakeKey);

  // Chained rather than `unionAll(a, b, ...rest)`: the variadic form takes a
  // tuple, and an array built by `map` is not one. Written out, the order also
  // stays the order project-overview.md §F lists the dimensions in.
  const rows = await accountBranch
    .unionAll(plainBranch("setupType"))
    .unionAll(plainBranch("entryModel"))
    .unionAll(plainBranch("session"))
    .unionAll(plainBranch("instrument"))
    .unionAll(plainBranch("weekday"))
    .unionAll(plainBranch("hour"))
    .unionAll(confluenceBranch)
    .unionAll(plainBranch("felt"))
    .unionAll(plainBranch("grade"))
    .unionAll(mistakeBranch);

  return rows.map((row) => ({
    dimension: row.dimension,
    bucket: row.bucket,
    trades: row.trades,
    wins: row.wins,
    netPnlCents: toNumber(row.netPnlCents),
    rSum: row.rSum === null ? null : Number(row.rSum),
    rCount: row.rCount,
  }));
}

// --- Missed setups -------------------------------------------------------

const MISSED_KEYS = {
  setupType: DIMENSION_KEYS.setupType,
  session: DIMENSION_KEYS.session,
  instrument: DIMENSION_KEYS.instrument,
  weekday: DIMENSION_KEYS.weekday,
} satisfies Record<MissedDimensionId, SQL>;

/**
 * **Count aggregate, and nothing else.** How many entries in each bucket were
 * missed setups, and how many entries that bucket holds in total — the
 * denominator of the share the section prints.
 *
 * No money column exists here on purpose. A missed setup has no exit and no
 * P&L, and a figure that implied otherwise would be invented.
 *
 * Both counts run over the same scope as the dimension tables, which includes
 * missed setups: they carry no account, so `scopeConditions` lets them through
 * in both the combined and the single-account mode.
 */
export async function getMissedSetupBreakdowns(
  scope: QueryScope,
  range?: DateRange,
  executor: ReadExecutor = db,
): Promise<MissedAggregateRow[]> {
  const where = scopeWhere(scope, range);

  function branch(dimension: MissedDimensionId) {
    const key = MISSED_KEYS[dimension];
    return executor
      .select({
        dimension: sql<MissedDimensionId>`${dimension}::text`,
        bucket: sql<string | null>`${key}`,
        missed: sql<number>`count(*) filter (where ${trades.taken} = false)::int`,
        entries: sql<number>`count(*)::int`,
      })
      .from(trades)
      .innerJoin(instruments, eq(trades.instrumentId, instruments.id))
      .where(where)
      .groupBy(key);
  }

  return branch("setupType")
    .unionAll(branch("session"))
    .unionAll(branch("instrument"))
    .unionAll(branch("weekday"));
}

// --- Execution (S12b) ----------------------------------------------------
// Hold time, risk calibration from MFE/MAE and exit efficiency from post-exit
// MFE — the rest of project-overview.md §F.
//
// **Every figure below is a count aggregate.** coding-standards.md names hold
// time and MFE/MAE explicitly: a copy-trade counts once, however many accounts
// it ran on. Nothing here touches moneyContribution or realAccountCount, and
// no figure in this section is a money value at all.
//
// Taken trades only. A missed setup has no exit and no hold time, and its
// mfe_r is the "would-be R" of Design.md §4.9 — not an excursion.

/**
 * The share of the available move the trade kept: `r / (r + post-exit MFE)`.
 *
 * NULL for anything that cannot answer the question — no post-exit value, no
 * stop price to measure R against, or a total that is zero or negative. The
 * caller restricts it to winners on top of that; `src/domain/execution.ts`
 * carries the same rule and its tests.
 */
const capturedShareExpr = sql<number | null>`(
  case
    when ${trades.postExitMfeR} is null then null
    when ${rMultipleSortKey} is null then null
    when (${rMultipleSortKey} + ${trades.postExitMfeR}) <= 0 then null
    else ${rMultipleSortKey} / (${rMultipleSortKey} + ${trades.postExitMfeR})
  end
)`;

/**
 * Whether this trade has an R to express an excursion in.
 *
 * MFE and MAE are stored **in R**, and R is `move / (entry - stop)` — without a
 * stop price it is not defined at all. The form takes the two fields anyway,
 * so the filter sits here on the read side.
 *
 * Two existing decisions already say the same thing: `rMultipleSortKey` is NULL
 * without a stop, so avg R has excluded these trades since S12a, and the form
 * only offers Post-exit MFE once a stop price is set
 * (`src/schemas/trades.ts`, superRefine). An average labelled "R" that mixes
 * defined and undefined R is worse than one over fewer trades.
 */
const hasDefinedR = sql`${trades.stopPrice} is not null`;

/** Winners and losers by derived P&L sign, the same split as everywhere else. */
const outcomeKey = sql<Outcome>`(
  case when ${tradePnlCents} > 0 then 'winner' else 'loser' end
)::text`;

const isWinner = sql`${tradePnlCents} > 0`;

export interface ExecutionSummaryRow {
  outcome: Outcome;
  /** Average hold time in minutes; null when no trade of this outcome has an exit. */
  holdMinutes: number | null;
  holdTrades: number;
  /**
   * Average MAE and MFE **magnitude** in R.
   *
   * Both drop the sign, for the reason spelled out on MAE_BUCKETS: the form
   * takes a plain number and does not say whether an excursion is typed as
   * -0.5 or 0.5. The bucketing has always used the magnitude; the average has
   * to agree with the bars beside it, or one card contradicts itself.
   */
  avgMaeR: number | null;
  maeTrades: number;
  avgMfeR: number | null;
  mfeTrades: number;
  /** Winners only; null on the loser row by construction. */
  capturedShare: number | null;
  capturedTrades: number;
  /** Average post-exit MFE in R — hypothetical, never rendered as a gain. */
  avgLeftOnTableR: number | null;
  leftOnTableTrades: number;
}

/**
 * **Count aggregate.** One row per outcome with every execution average, in a
 * single statement.
 *
 * Grouped by outcome rather than spelled out as two sets of columns, so adding
 * a figure means adding one column and not two. Trades without a derived P&L
 * (no exit yet) carry no outcome and are filtered out rather than forming a
 * third group.
 *
 * Each average ships with the count of trades that actually carried the value:
 * an avg MAE over two trades is a different claim than one over two hundred,
 * and the card says which it is.
 */
export async function getExecutionSummary(
  scope: QueryScope,
  range?: DateRange,
  executor: ReadExecutor = db,
): Promise<ExecutionSummaryRow[]> {
  const rows = await executor
    .select({
      outcome: outcomeKey,
      holdMinutes: sql<string | null>`avg(${holdMinutes})`,
      holdTrades: sql<number>`count(${holdMinutes})::int`,
      avgMaeR: sql<
        string | null
      >`avg(abs(${trades.maeR})) filter (where ${hasDefinedR})`,
      maeTrades: sql<number>`count(${trades.maeR}) filter (where ${hasDefinedR})::int`,
      avgMfeR: sql<
        string | null
      >`avg(abs(${trades.mfeR})) filter (where ${hasDefinedR})`,
      mfeTrades: sql<number>`count(${trades.mfeR}) filter (where ${hasDefinedR})::int`,
      capturedShare: sql<
        string | null
      >`avg(${capturedShareExpr}) filter (where ${isWinner})`,
      capturedTrades: sql<number>`count(${capturedShareExpr}) filter (where ${isWinner})::int`,
      avgLeftOnTableR: sql<
        string | null
      >`avg(${trades.postExitMfeR}) filter (where ${isWinner})`,
      leftOnTableTrades: sql<number>`count(${trades.postExitMfeR}) filter (where ${isWinner})::int`,
    })
    .from(trades)
    .innerJoin(instruments, eq(trades.instrumentId, instruments.id))
    .where(and(takenScope(scope, range), sql`${tradePnlCents} is not null`))
    .groupBy(outcomeKey);

  return rows.map((row) => ({
    outcome: row.outcome,
    holdMinutes: row.holdMinutes === null ? null : Number(row.holdMinutes),
    holdTrades: row.holdTrades,
    avgMaeR: row.avgMaeR === null ? null : Number(row.avgMaeR),
    maeTrades: row.maeTrades,
    avgMfeR: row.avgMfeR === null ? null : Number(row.avgMfeR),
    mfeTrades: row.mfeTrades,
    capturedShare:
      row.capturedShare === null ? null : Number(row.capturedShare),
    capturedTrades: row.capturedTrades,
    avgLeftOnTableR:
      row.avgLeftOnTableR === null ? null : Number(row.avgLeftOnTableR),
    leftOnTableTrades: row.leftOnTableTrades,
  }));
}

/**
 * The bucket boundaries of src/domain/execution.ts, as a CASE expression.
 *
 * Generated from the same constants the labels come from, so the SQL and the
 * axis of the card cannot drift apart. `abs()` is what makes the MAE sign
 * irrelevant — the form does not say whether to type -0.5 or 0.5.
 */
function bucketIndexExpr(kind: ExcursionKind, value: SQL): SQL<number> {
  const buckets = bucketsFor(kind);
  const branches = buckets
    .filter((bucket) => bucket.to !== null)
    .map(
      (bucket, index) => sql`when abs(${value}) < ${bucket.to} then ${index}`,
    );

  return sql<number>`(case ${sql.join(branches, sql` `)} else ${
    buckets.length - 1
  } end)::int`;
}

/**
 * **Count aggregate.** How many trades of each outcome fall into each MAE and
 * MFE bucket, in one statement.
 *
 * Two branches unioned rather than two round trips. Buckets with no trade
 * simply do not come back; `buildExcursionRows` fills the gaps, because a
 * missing bar is part of the distribution's shape.
 */
export async function getExcursionBuckets(
  scope: QueryScope,
  range?: DateRange,
  executor: ReadExecutor = db,
): Promise<ExcursionCount[]> {
  const where = and(
    takenScope(scope, range),
    sql`${tradePnlCents} is not null`,
  );

  // The bucket index is computed in a subquery and grouped by its alias in the
  // outer select, rather than repeating the CASE in both places. Postgres
  // matches a GROUP BY expression to a select expression syntactically, and
  // Drizzle binds each boundary as a fresh parameter — the two copies render
  // as $2 and $13 and stop looking like the same expression, which costs a
  // "must appear in the GROUP BY clause" error. Same family as the
  // qualification trap in coding-standards.md, Database.
  function branch(kind: ExcursionKind, column: SQL) {
    const rows = executor
      .select({
        outcome: outcomeKey.as("outcome"),
        bucketIndex: bucketIndexExpr(kind, column).as("bucket_index"),
      })
      .from(trades)
      .innerJoin(instruments, eq(trades.instrumentId, instruments.id))
      .where(and(where, sql`${column} is not null`, hasDefinedR))
      .as(`${kind}_rows`);

    return executor
      .select({
        kind: sql<ExcursionKind>`${kind}::text`,
        outcome: rows.outcome,
        bucketIndex: rows.bucketIndex,
        trades: sql<number>`count(*)::int`,
      })
      .from(rows)
      .groupBy(rows.outcome, rows.bucketIndex);
  }

  return branch("mae", sql`${trades.maeR}`).unionAll(
    branch("mfe", sql`${trades.mfeR}`),
  );
}

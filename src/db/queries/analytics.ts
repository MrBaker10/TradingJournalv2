import { and, eq, type SQL, sql } from "drizzle-orm";
import type {
  DimensionAggregateRow,
  DimensionId,
  MissedAggregateRow,
  MissedDimensionId,
} from "../../domain/analytics.ts";
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
import { rMultipleSortKey, tradePnlCents } from "./trades.ts";

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

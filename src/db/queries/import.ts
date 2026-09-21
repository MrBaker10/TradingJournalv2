import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { MatchableTrade } from "../../domain/import/match.ts";
import type { BrokerValues } from "../../domain/import/outcome.ts";
import type { TradeDirection } from "../../domain/pnl.ts";
import { db } from "../index.ts";
import { importBatches } from "../schema/import-batches.ts";
import { tradeAccounts, trades } from "../schema/trades.ts";
import { toNumber } from "./scope.ts";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Lets a test run a read inside a rolled-back transaction and still see its
 * own fixtures, the same seam `analytics.ts` uses. Production passes none.
 */
export type ReadExecutor = Pick<typeof db, "select" | "execute">;

/**
 * The trades tier 1 and tier 2 are allowed to match against.
 *
 * Scoped to **one account**: the duplicate check never reaches across
 * accounts, which is the first thing that was settled about this feature.
 * The join to `trade_accounts` is that scope — a missed setup carries no
 * account assignment at all (src/domain/trades.ts) and therefore cannot be
 * reached by it, which is correct: a broker fill is never a setup the user
 * did not take.
 *
 * `dates` bounds the read to the days the file mentions. A 2000-row file
 * covers at most 2000 of them, so this stays a small, indexed read rather
 * than the whole journal.
 *
 * `row_number()` is what gives both sides of the pairing a stable order, so
 * the same file against the same journal always produces the same assignment.
 * The pairing itself is pure and lives in src/domain/import/match.ts.
 */
export async function listMatchCandidates(
  userId: number,
  accountId: number,
  dates: string[],
  executor: ReadExecutor = db,
): Promise<MatchableTrade[]> {
  if (dates.length === 0) return [];

  const rows = await executor
    .select({
      id: trades.id,
      instrumentId: trades.instrumentId,
      direction: trades.direction,
      contracts: trades.contracts,
      tradeDate: trades.tradeDate,
      entryTime: trades.entryTime,
      exitTime: trades.exitTime,
      entryPrice: trades.entryPrice,
      exitPrice: trades.exitPrice,
      points: trades.points,
      result: trades.result,
      brokerTradeKey: trades.brokerTradeKey,
      occurrence: sql<number>`row_number() over (
        partition by ${trades.tradeDate}, ${trades.instrumentId},
                     ${trades.direction}, ${trades.contracts},
                     ${trades.entryPrice}
        order by ${trades.id}
      )`,
    })
    .from(trades)
    .innerJoin(
      tradeAccounts,
      and(
        eq(tradeAccounts.tradeId, trades.id),
        eq(tradeAccounts.accountId, accountId),
      ),
    )
    .where(
      and(
        eq(trades.userId, userId),
        eq(trades.taken, true),
        inArray(trades.tradeDate, dates),
      ),
    )
    .orderBy(trades.tradeDate, trades.id);

  return rows.map((row) => ({
    id: row.id,
    instrumentId: row.instrumentId,
    direction: row.direction as TradeDirection,
    contracts: row.contracts,
    tradeDate: row.tradeDate,
    entryTime: row.entryTime,
    exitTime: row.exitTime,
    entryPrice: Number(row.entryPrice),
    exitPrice: row.exitPrice === null ? null : Number(row.exitPrice),
    points: row.points === null ? null : Number(row.points),
    result: row.result,
    brokerTradeKey: row.brokerTradeKey,
  }));
}

export interface NewBatch {
  userId: number;
  accountId: number;
  filename: string;
  rowCount: number;
  detectedShape: string;
}

export async function createImportBatch(
  tx: Tx,
  batch: NewBatch,
): Promise<number> {
  const [created] = await tx
    .insert(importBatches)
    .values(batch)
    .returning({ id: importBatches.id });
  return created.id;
}

export interface ImportedTrade {
  userId: number;
  tradeDate: string;
  instrumentId: number;
  contracts: number;
  entryTime: string;
  exitTime: string | null;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number | null;
  points: number | null;
  result: string | null;
  session: string | null;
  brokerTradeKey: string | null;
  importBatchId: number;
}

/**
 * Writes the new trades of a batch and assigns each to the one target
 * account.
 *
 * Every imported trade is `taken = true` and gets exactly one
 * `trade_accounts` row: an import never spreads a file across accounts, and
 * there is no numeric copy-trading count to set — `trade_accounts` replaced it
 * (project-structure.md).
 *
 * Numbers go in as strings because every price and point column is `numeric`;
 * handing postgres a JS number here is how a float creeps into a money column.
 */
export async function insertImportedTrades(
  tx: Tx,
  rows: ImportedTrade[],
  accountId: number,
): Promise<number[]> {
  if (rows.length === 0) return [];

  const inserted = await tx
    .insert(trades)
    .values(
      rows.map((row) => ({
        userId: row.userId,
        tradeDate: row.tradeDate,
        instrumentId: row.instrumentId,
        taken: true,
        contracts: row.contracts,
        entryTime: row.entryTime,
        exitTime: row.exitTime,
        direction: row.direction,
        entryPrice: String(row.entryPrice),
        exitPrice: row.exitPrice === null ? null : String(row.exitPrice),
        points: row.points === null ? null : String(row.points),
        result: row.result,
        session: row.session,
        brokerTradeKey: row.brokerTradeKey,
        importBatchId: row.importBatchId,
      })),
    )
    .returning({ id: trades.id });

  await tx
    .insert(tradeAccounts)
    .values(inserted.map((row) => ({ tradeId: row.id, accountId })));

  return inserted.map((row) => row.id);
}

/**
 * Applies one matched row's broker-owned changes.
 *
 * `values` comes from `decideOutcome` and can only ever hold broker-owned
 * fields, so nothing the user typed is reachable from here. `session` is not
 * among them: the import sets it when it creates a trade and never on an
 * update.
 */
export async function updateImportedTrade(
  tx: Tx,
  userId: number,
  tradeId: number,
  values: BrokerValues,
): Promise<void> {
  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if (values.tradeDate !== undefined) patch.tradeDate = values.tradeDate;
  if (values.instrumentId !== undefined)
    patch.instrumentId = values.instrumentId;
  if (values.direction !== undefined) patch.direction = values.direction;
  if (values.contracts !== undefined) patch.contracts = values.contracts;
  if (values.entryTime !== undefined) patch.entryTime = values.entryTime;
  if (values.exitTime !== undefined) patch.exitTime = values.exitTime;
  if (values.entryPrice !== undefined)
    patch.entryPrice = String(values.entryPrice);
  if (values.exitPrice !== undefined)
    patch.exitPrice = String(values.exitPrice);
  if (values.points !== undefined) patch.points = String(values.points);
  if (values.result !== undefined) patch.result = values.result;

  // The user id is part of the where clause, not just checked beforehand:
  // ownership is re-verified in the statement that writes.
  await tx
    .update(trades)
    .set(patch)
    .where(and(eq(trades.id, tradeId), eq(trades.userId, userId)));
}

/**
 * Whether a trade has been worked on since it was imported.
 *
 * `session` is deliberately absent: the import writes it itself, so it is not
 * evidence of handiwork. Were it in this list, every imported trade with an
 * entry time inside a session window would be protected and an undo could
 * never remove anything (decided 2026-09-18).
 *
 * The aliases are spelled out rather than left to Drizzle: a correlated
 * subquery in a select list renders as `where "trade_id" = "id"`, which
 * postgres reads as two columns of the same table
 * (coding-standards.md, Database).
 */
const TOUCHED = sql`(
  t.notes is not null
  or t.setup_type is not null
  or t.entry_model is not null
  or t.stop_price is not null
  or t.mfe_r is not null
  or t.mae_r is not null
  or t.post_exit_mfe_r is not null
  or t.grade is not null
  or t.felt is not null
  or t.by_the_book is not null
  or t.pnl_override is not null
  or exists (select 1 from trade_screenshots s where s.trade_id = t.id)
  or exists (select 1 from trade_links l where l.trade_id = t.id)
  or exists (select 1 from trade_confluences c where c.trade_id = t.id)
  or exists (select 1 from trade_mistakes m where m.trade_id = t.id)
)`;

export interface ImportBatchSummary {
  id: number;
  filename: string;
  detectedShape: string;
  createdAt: Date;
  accountName: string;
  /** Trades of this batch still in the journal. */
  total: number;
  /** How many of those an undo would remove. */
  removable: number;
}

/**
 * The batches this user can undo, newest first, each with the two counts the
 * button label needs ("Remove 56 of 56").
 */
export async function listImportBatches(
  userId: number,
  executor: ReadExecutor = db,
): Promise<ImportBatchSummary[]> {
  const rows = await executor.execute<{
    id: number;
    filename: string;
    detected_shape: string;
    // A string, not a Date. A raw `execute` carries no drizzle column mapper,
    // so the driver value arrives untouched and this generic only asserts —
    // it is not checked against anything. Converted in the mapper below, the
    // same way dashboard.ts handles its `sql<Date>` aggregate.
    created_at: string;
    account_name: string;
    total: string;
    removable: string;
  }>(sql`
    select b.id,
           b.filename,
           b.detected_shape,
           b.created_at,
           a.name as account_name,
           count(t.id) as total,
           count(t.id) filter (where not ${TOUCHED}) as removable
    from import_batches b
    join accounts a on a.id = b.account_id
    left join trades t on t.import_batch_id = b.id
    where b.user_id = ${userId}
    group by b.id, b.filename, b.detected_shape, b.created_at, a.name
    order by b.created_at desc, b.id desc
  `);

  return [...rows].map((row) => ({
    id: row.id,
    filename: row.filename,
    detectedShape: row.detected_shape,
    createdAt: new Date(row.created_at),
    accountName: row.account_name,
    total: toNumber(row.total),
    removable: toNumber(row.removable),
  }));
}

/**
 * Removes the untouched trades of one batch and reports how many went.
 *
 * Anything enriched by hand stays, and so does the batch row itself while
 * trades still point at it — a kept trade should still be able to say where it
 * came from. A batch nothing is left of is removed with it.
 *
 * The join tables cascade on `trades.id`, so the assignments, tags,
 * screenshots and links of a removed trade go with it.
 */
export async function removeUntouchedTrades(
  tx: Tx,
  userId: number,
  batchId: number,
): Promise<number> {
  const removed = await tx.execute<{ id: number }>(sql`
    delete from trades t
    where t.import_batch_id = ${batchId}
      and t.user_id = ${userId}
      and not ${TOUCHED}
    returning t.id
  `);

  const [remaining] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(trades)
    .where(and(eq(trades.importBatchId, batchId), eq(trades.userId, userId)));

  if (toNumber(remaining?.count) === 0) {
    await tx
      .delete(importBatches)
      .where(
        and(eq(importBatches.id, batchId), eq(importBatches.userId, userId)),
      );
  }

  return [...removed].length;
}

/** Ownership check for a batch id coming from the client. */
export async function getOwnedImportBatch(
  userId: number,
  batchId: number,
  executor: ReadExecutor = db,
): Promise<{ id: number } | null> {
  const [batch] = await executor
    .select({ id: importBatches.id })
    .from(importBatches)
    .where(and(eq(importBatches.id, batchId), eq(importBatches.userId, userId)))
    .orderBy(desc(importBatches.id))
    .limit(1);

  return batch ?? null;
}

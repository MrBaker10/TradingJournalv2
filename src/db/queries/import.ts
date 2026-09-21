import { and, eq, inArray, sql } from "drizzle-orm";
import type { MatchableTrade } from "../../domain/import/match.ts";
import {
  BROKER_OWNED_FIELDS,
  type BrokerOwnedField,
  type BrokerValues,
} from "../../domain/import/outcome.ts";
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
/**
 * The column each broker-owned field writes to, and the type its parameter has
 * to carry into a `VALUES` list.
 *
 * Keyed by `BrokerOwnedField`, so the identifiers that reach the statement can
 * only ever come from that const — never from a key of the incoming object.
 */
const UPDATABLE_COLUMN: Record<
  BrokerOwnedField,
  { column: string; type: string }
> = {
  tradeDate: { column: "trade_date", type: "date" },
  instrumentId: { column: "instrument_id", type: "integer" },
  direction: { column: "direction", type: "text" },
  contracts: { column: "contracts", type: "integer" },
  entryTime: { column: "entry_time", type: "time" },
  exitTime: { column: "exit_time", type: "time" },
  entryPrice: { column: "entry_price", type: "numeric(12,4)" },
  exitPrice: { column: "exit_price", type: "numeric(12,4)" },
  points: { column: "points", type: "numeric(12,4)" },
  result: { column: "result", type: "text" },
};

/** Numbers destined for a `numeric` column go in as strings, never as floats. */
function parameterFor(values: BrokerValues, field: BrokerOwnedField): unknown {
  const value = values[field];
  if (value === undefined) return null;
  return UPDATABLE_COLUMN[field].type.startsWith("numeric")
    ? String(value)
    : value;
}

/** One trade and the broker-owned fields this import wants to write on it. */
export interface TradeUpdate {
  tradeId: number;
  values: BrokerValues;
}

/**
 * The fields an update touches, in the fixed order of `BROKER_OWNED_FIELDS`.
 * Two updates that touch the same fields share a statement.
 */
function signatureOf(values: BrokerValues): BrokerOwnedField[] {
  return BROKER_OWNED_FIELDS.filter((field) => values[field] !== undefined);
}

/**
 * Writes the broker-owned side of several matched trades.
 *
 * **One statement per distinct set of changed fields**, not one per trade. A
 * file whose rows all close an open position — the ordinary case — therefore
 * costs a single round trip however many rows it has, instead of one each.
 *
 * The `SET` list stays narrow on purpose: only the fields that actually
 * differ are named. Writing all ten and letting the unchanged ones pass
 * through would mean an import could overwrite a field it never read, and the
 * rule that an import fills gaps but never makes them would hang on the
 * values in a `VALUES` list rather than on the shape of the statement.
 *
 * The user id sits in the `where`, not only in a check beforehand: ownership
 * is re-verified by the statement that writes.
 */
export async function updateImportedTrades(
  tx: Tx,
  userId: number,
  updates: TradeUpdate[],
): Promise<number> {
  const groups = new Map<string, TradeUpdate[]>();
  for (const update of updates) {
    const fields = signatureOf(update.values);
    if (fields.length === 0) continue;

    const key = fields.join(",");
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, [update]);
    } else {
      group.push(update);
    }
  }

  let written = 0;

  for (const [key, group] of groups) {
    const fields = key.split(",") as BrokerOwnedField[];
    const columns = fields.map((field) => UPDATABLE_COLUMN[field].column);

    const assignments = sql.join(
      columns.map((column) => sql`${sql.raw(column)} = v.${sql.raw(column)}`),
      sql`, `,
    );

    // Every tuple carries its casts. Postgres would infer them from the first
    // row alone, but a list whose first row happens to be all-null would then
    // decide the types for the rest.
    const tuples = sql.join(
      group.map(
        (update) =>
          sql`(${sql.join(
            [
              sql`${update.tradeId}::integer`,
              ...fields.map(
                (field) =>
                  sql`${parameterFor(update.values, field)}::${sql.raw(
                    UPDATABLE_COLUMN[field].type,
                  )}`,
              ),
            ],
            sql`, `,
          )})`,
      ),
      sql`, `,
    );

    const alias = sql.raw(["id", ...columns].join(", "));

    const rows = await tx.execute<{ id: number }>(sql`
      update trades t
      set updated_at = now(), ${assignments}
      from (values ${tuples}) as v(${alias})
      where t.id = v.id and t.user_id = ${userId}
      returning t.id
    `);

    written += [...rows].length;
  }

  return written;
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

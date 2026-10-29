import { and, desc, eq, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { messageKey } from "../../lib/i18n/message-keys.ts";
import { db } from "../index.ts";
import { instruments } from "../schema/instruments.ts";
import { strategyRevisions, tradingStrategies } from "../schema/strategies.ts";
import { trades } from "../schema/trades.ts";
import { scopeWhere } from "./scope.ts";

// Strategy lifecycle and public reads. A strategy's name and rules live in
// immutable revisions (docs/adr/0003): an edit appends a revision and never
// touches an earlier one. Every function takes the user and filters on it, so
// an id from the client can never reach another user's strategy.

/** A strategy rule the request broke; the message is meant for the user. */
export class StrategyError extends Error {}

const STRATEGY_NOT_FOUND = messageKey("errors.strategyGone");

type RevisionSelect = typeof strategyRevisions.$inferSelect;
type StrategySelect = typeof tradingStrategies.$inferSelect;

/** The name and the five chapters; an empty chapter is null. */
export type StrategyContent = Pick<
  RevisionSelect,
  "name" | "prerequisites" | "entry" | "stopRisk" | "exit" | "exclusions"
>;

/** A strategy with the rules it currently has. */
export type Strategy = StrategyContent & {
  id: StrategySelect["id"];
  revisionId: RevisionSelect["id"];
  archivedAt: StrategySelect["archivedAt"];
};

/** One recorded rule set, as an assigned trade will read it. */
export type StrategyRevision = StrategyContent & {
  id: RevisionSelect["id"];
  strategyId: RevisionSelect["strategyId"];
  createdAt: RevisionSelect["createdAt"];
};

const contentColumns = {
  name: strategyRevisions.name,
  prerequisites: strategyRevisions.prerequisites,
  entry: strategyRevisions.entry,
  stopRisk: strategyRevisions.stopRisk,
  exit: strategyRevisions.exit,
  exclusions: strategyRevisions.exclusions,
};

const strategyColumns = {
  id: tradingStrategies.id,
  revisionId: strategyRevisions.id,
  archivedAt: tradingStrategies.archivedAt,
  ...contentColumns,
};

function sameContent(a: StrategyContent, b: StrategyContent): boolean {
  return (
    a.name === b.name &&
    a.prerequisites === b.prerequisites &&
    a.entry === b.entry &&
    a.stopRisk === b.stopRisk &&
    a.exit === b.exit &&
    a.exclusions === b.exclusions
  );
}

/**
 * Creates a strategy and its first revision together, so a strategy never
 * exists without rules to read.
 */
export async function createStrategy(
  userId: number,
  content: StrategyContent,
  executor: Pick<typeof db, "transaction"> = db,
): Promise<{ id: number; revisionId: number }> {
  return executor.transaction(async (tx) => {
    const [strategy] = await tx
      .insert(tradingStrategies)
      .values({ userId })
      .returning({ id: tradingStrategies.id });
    const [revision] = await tx
      .insert(strategyRevisions)
      .values({ strategyId: strategy.id, ...content })
      .returning({ id: strategyRevisions.id });
    return { id: strategy.id, revisionId: revision.id };
  });
}

/**
 * Records new rules for one of the user's strategies as a new revision. Saving
 * the rules it already has appends nothing: a revision means the rules
 * changed, and later adopting it would clear an unchanged by-the-book answer
 * for no reason. The strategy row is locked, so two edits at once are
 * compared against each other, not against the same stale revision.
 */
export async function updateStrategy(
  userId: number,
  strategyId: number,
  content: StrategyContent,
  executor: Pick<typeof db, "transaction"> = db,
): Promise<{ revisionId: number }> {
  return executor.transaction(async (tx) => {
    const [owned] = await tx
      .select({ id: tradingStrategies.id })
      .from(tradingStrategies)
      .where(
        and(
          eq(tradingStrategies.id, strategyId),
          eq(tradingStrategies.userId, userId),
        ),
      )
      .limit(1)
      .for("update");
    if (owned === undefined) throw new StrategyError(STRATEGY_NOT_FOUND);

    const [current] = await tx
      .select({ id: strategyRevisions.id, ...contentColumns })
      .from(strategyRevisions)
      .where(eq(strategyRevisions.strategyId, strategyId))
      .orderBy(desc(strategyRevisions.id))
      .limit(1);
    if (current !== undefined && sameContent(current, content)) {
      return { revisionId: current.id };
    }

    const [revision] = await tx
      .insert(strategyRevisions)
      .values({ strategyId, ...content })
      .returning({ id: strategyRevisions.id });
    return { revisionId: revision.id };
  });
}

/**
 * Takes one of the user's strategies out of new assignments. Nothing else
 * changes: its revisions, the trades holding them and their answers stay
 * (docs/adr/0003). Archiving an archived strategy keeps the first time.
 */
export async function archiveStrategy(
  userId: number,
  strategyId: number,
  executor: Pick<typeof db, "update" | "select"> = db,
): Promise<void> {
  const updated = await executor
    .update(tradingStrategies)
    .set({ archivedAt: new Date() })
    .where(
      and(
        eq(tradingStrategies.id, strategyId),
        eq(tradingStrategies.userId, userId),
        isNull(tradingStrategies.archivedAt),
      ),
    )
    .returning({ id: tradingStrategies.id });
  if (updated.length === 0) await requireOwned(userId, strategyId, executor);
}

/** Makes an archived strategy available for new assignments again. */
export async function reactivateStrategy(
  userId: number,
  strategyId: number,
  executor: Pick<typeof db, "update" | "select"> = db,
): Promise<void> {
  const updated = await executor
    .update(tradingStrategies)
    .set({ archivedAt: null })
    .where(
      and(
        eq(tradingStrategies.id, strategyId),
        eq(tradingStrategies.userId, userId),
        isNotNull(tradingStrategies.archivedAt),
      ),
    )
    .returning({ id: tradingStrategies.id });
  if (updated.length === 0) await requireOwned(userId, strategyId, executor);
}

/** The no-op case of a lifecycle change: fine when owned, an error when not. */
async function requireOwned(
  userId: number,
  strategyId: number,
  executor: Pick<typeof db, "select">,
): Promise<void> {
  const [row] = await executor
    .select({ id: tradingStrategies.id })
    .from(tradingStrategies)
    .where(
      and(
        eq(tradingStrategies.id, strategyId),
        eq(tradingStrategies.userId, userId),
      ),
    )
    .limit(1);
  if (row === undefined) throw new StrategyError(STRATEGY_NOT_FOUND);
}

/** The user's strategies with their current rules, by name. */
export async function listStrategies(
  userId: number,
  executor: Pick<typeof db, "selectDistinctOn"> = db,
): Promise<Strategy[]> {
  const rows = await executor
    .selectDistinctOn([strategyRevisions.strategyId], strategyColumns)
    .from(strategyRevisions)
    .innerJoin(
      tradingStrategies,
      eq(tradingStrategies.id, strategyRevisions.strategyId),
    )
    .where(eq(tradingStrategies.userId, userId))
    .orderBy(strategyRevisions.strategyId, desc(strategyRevisions.id));
  return rows.sort(
    (a, b) =>
      a.name.localeCompare(b.name, "en", { sensitivity: "base" }) ||
      a.id - b.id,
  );
}

/** One of the user's strategies with its current rules, or null. */
export async function getStrategy(
  userId: number,
  strategyId: number,
  executor: Pick<typeof db, "select"> = db,
): Promise<Strategy | null> {
  const [row] = await executor
    .select(strategyColumns)
    .from(strategyRevisions)
    .innerJoin(
      tradingStrategies,
      eq(tradingStrategies.id, strategyRevisions.strategyId),
    )
    .where(
      and(
        eq(tradingStrategies.id, strategyId),
        eq(tradingStrategies.userId, userId),
      ),
    )
    .orderBy(desc(strategyRevisions.id))
    .limit(1);
  return row ?? null;
}

/**
 * One recorded rule set of the user's, exactly as it was saved, or null. An
 * assigned trade reads its rules through here, however often the strategy
 * has been edited since.
 */
export async function getStrategyRevision(
  userId: number,
  revisionId: number,
  executor: Pick<typeof db, "select"> = db,
): Promise<StrategyRevision | null> {
  const [row] = await executor
    .select({
      id: strategyRevisions.id,
      strategyId: strategyRevisions.strategyId,
      createdAt: strategyRevisions.createdAt,
      ...contentColumns,
    })
    .from(strategyRevisions)
    .innerJoin(
      tradingStrategies,
      eq(tradingStrategies.id, strategyRevisions.strategyId),
    )
    .where(
      and(
        eq(strategyRevisions.id, revisionId),
        eq(tradingStrategies.userId, userId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * The current rules of a strategy a trade may be newly assigned: the user's
 * own and not archived. Null otherwise — the caller reports one message for
 * "not yours", "gone" and "archived" alike.
 */
export async function getAssignableRevisionId(
  userId: number,
  strategyId: number,
  executor: Pick<typeof db, "select"> = db,
): Promise<number | null> {
  const strategy = await getStrategy(userId, strategyId, executor);
  return strategy !== null && strategy.archivedAt === null
    ? strategy.revisionId
    : null;
}

/** The strategy a stored revision belongs to; the trade holding it is the caller's. */
export async function getRevisionStrategyId(
  revisionId: number,
  executor: Pick<typeof db, "select"> = db,
): Promise<number | null> {
  const [row] = await executor
    .select({ strategyId: strategyRevisions.strategyId })
    .from(strategyRevisions)
    .where(eq(strategyRevisions.id, revisionId))
    .limit(1);
  return row?.strategyId ?? null;
}

/** One trade holding a revision of a strategy, as the strategy's sheet lists it. */
export interface StrategyTradeRow {
  id: number;
  strategyId: number;
  tradeDate: string;
  taken: boolean;
  instrumentSymbol: string;
  /** False: the trade holds rules the strategy has since changed (docs/adr/0003). */
  onCurrentRules: boolean;
  /** Every trade holding this strategy, not only the ones listed. */
  total: number;
}

/** How many trades a strategy's sheet lists; `total` says how many there are. */
export const STRATEGY_TRADES_SHOWN = 20;

/**
 * The latest trades assigned to each of the user's strategies, newest first
 * per strategy, at most `STRATEGY_TRADES_SHOWN` each. Seen as "All accounts"
 * sees them: a taken trade only on practice accounts is left out, a missed
 * setup always shows. One query for the whole page, so the sheet reads rows.
 */
export async function listStrategyTrades(
  userId: number,
  executor: Pick<typeof db, "select"> = db,
): Promise<StrategyTradeRow[]> {
  const ranked = executor
    .select({
      id: trades.id,
      strategyId: sql<number>`${strategyRevisions.strategyId}`.as(
        "strategy_id",
      ),
      tradeDate: trades.tradeDate,
      taken: trades.taken,
      instrumentSymbol: sql<string>`${instruments.symbol}`.as(
        "instrument_symbol",
      ),
      onCurrentRules: sql<boolean>`${trades.strategyRevisionId} = (
        select max(latest.id) from ${strategyRevisions} latest
        where latest.strategy_id = ${strategyRevisions.strategyId}
      )`.as("on_current_rules"),
      position: sql<number>`row_number() over (
        partition by ${strategyRevisions.strategyId}
        order by ${trades.tradeDate} desc, ${trades.entryTime} desc, ${trades.id} desc
      )::int`.as("position"),
      total: sql<number>`count(*) over (
        partition by ${strategyRevisions.strategyId}
      )::int`.as("total"),
    })
    .from(trades)
    .innerJoin(
      strategyRevisions,
      eq(strategyRevisions.id, trades.strategyRevisionId),
    )
    .innerJoin(instruments, eq(instruments.id, trades.instrumentId))
    .where(scopeWhere({ userId, selectedAccountId: null }))
    .as("ranked");

  return executor
    .select({
      id: ranked.id,
      strategyId: ranked.strategyId,
      tradeDate: ranked.tradeDate,
      taken: ranked.taken,
      instrumentSymbol: ranked.instrumentSymbol,
      onCurrentRules: ranked.onCurrentRules,
      total: ranked.total,
    })
    .from(ranked)
    .where(lte(ranked.position, STRATEGY_TRADES_SHOWN))
    .orderBy(ranked.strategyId, ranked.position);
}

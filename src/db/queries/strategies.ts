import { and, desc, eq } from "drizzle-orm";
import { db } from "../index.ts";
import { strategyRevisions, tradingStrategies } from "../schema/strategies.ts";

// Strategy lifecycle and public reads. A strategy's name and rules live in
// immutable revisions (docs/adr/0003): an edit appends a revision and never
// touches an earlier one. Every function takes the user and filters on it, so
// an id from the client can never reach another user's strategy.

/** A strategy rule the request broke; the message is meant for the user. */
export class StrategyError extends Error {}

const STRATEGY_NOT_FOUND = "This strategy no longer exists.";

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

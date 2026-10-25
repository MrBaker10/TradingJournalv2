import type { Strategy } from "../../db/queries/strategies.ts";

/** A strategy a trade form offers; an archived one only while the trade has it. */
export interface StrategyOption {
  id: number;
  name: string;
  archived: boolean;
  /** The strategy's newest revision, which a trade can explicitly adopt. */
  currentRevisionId: number;
}

/**
 * The strategies a trade form offers: the active ones, plus the one the trade
 * already has when it is archived — dropping it would silently clear an
 * assignment the user never touched. An archived strategy is never offered
 * for a new assignment; the server enforces that too (src/lib/trades/save.ts).
 */
export function strategyOptions(
  strategies: Strategy[],
  assignedStrategyId: number | null,
): StrategyOption[] {
  return strategies
    .filter(
      (strategy) =>
        strategy.archivedAt === null || strategy.id === assignedStrategyId,
    )
    .map((strategy) => ({
      id: strategy.id,
      name: strategy.name,
      archived: strategy.archivedAt !== null,
      currentRevisionId: strategy.revisionId,
    }));
}

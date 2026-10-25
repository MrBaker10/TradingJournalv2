import type { Strategy } from "../../db/queries/strategies.ts";

/**
 * The strategies a trade form offers: the active ones, plus the one the trade
 * already has when it is archived — dropping it would silently clear an
 * assignment the user never touched. An archived strategy is never offered
 * for a new assignment; the server enforces that too (src/lib/trades/save.ts).
 */
export function strategyOptions(
  strategies: Strategy[],
  assignedStrategyId: number | null,
): { id: number; name: string; archived: boolean }[] {
  return strategies
    .filter(
      (strategy) =>
        strategy.archivedAt === null || strategy.id === assignedStrategyId,
    )
    .map((strategy) => ({
      id: strategy.id,
      name: strategy.name,
      archived: strategy.archivedAt !== null,
    }));
}

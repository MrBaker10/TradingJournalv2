"use client";

import { Plus } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Strategy, StrategyTradeRow } from "@/db/queries/strategies";
import { StrategySheet, type StrategySheetTarget } from "./strategy-sheet";
import { StrategyTable } from "./strategy-table";

/**
 * The strategies page's body: "Add strategy", the table and the one sheet
 * both open. The open strategy is component state, not the URL: nothing
 * links to a strategy. It is looked up in the current rows, so a save shows
 * the fresh rules.
 */
export function StrategyList({
  header,
  strategies,
  trades,
}: {
  header: ReactNode;
  strategies: Strategy[];
  /** The latest trades of every strategy (`listStrategyTrades`). */
  trades: StrategyTradeRow[];
}) {
  const [open, setOpen] = useState<number | "new" | null>(null);
  const openStrategy =
    typeof open === "number"
      ? strategies.find((strategy) => strategy.id === open)
      : undefined;
  const target: StrategySheetTarget | null =
    open === "new"
      ? { kind: "new" }
      : openStrategy
        ? {
            kind: "strategy",
            strategy: openStrategy,
            trades: trades.filter(
              (trade) => trade.strategyId === openStrategy.id,
            ),
          }
        : null;
  // Every row of a strategy carries its total, so the first one counts.
  const tradeCounts = new Map<number, number>();
  for (const trade of trades) tradeCounts.set(trade.strategyId, trade.total);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        {header}
        <Button size="lg" className="h-10 px-4" onClick={() => setOpen("new")}>
          <Plus aria-hidden="true" />
          Add strategy
        </Button>
      </div>
      {strategies.length === 0 ? (
        <p className="mx-auto max-w-md py-10 text-center text-muted-foreground text-sm">
          No strategy yet. A strategy is a set of rules you write yourself —
          prerequisites, entry, stop, exit, exclusions — and a trade can be
          assigned one in its Why step. Start with a name.
        </p>
      ) : (
        <StrategyTable
          strategies={strategies}
          tradeCounts={tradeCounts}
          openId={target?.kind === "strategy" ? target.strategy.id : null}
          onOpen={setOpen}
        />
      )}
      <StrategySheet target={target} onClose={() => setOpen(null)} />
    </>
  );
}

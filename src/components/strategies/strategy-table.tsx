"use client";

import { ChevronRight } from "lucide-react";
import { moveRowFocus } from "@/components/ui/row-focus";
import type { Strategy } from "@/db/queries/strategies";
import { STRATEGY_CHAPTERS } from "./strategy-chapters";

/**
 * Strategies as the dense table of Design.md §3.4: a row per strategy with
 * the chapters written and the trades holding it as mono figures. Header and
 * figure cells do not wrap; the name cell may. The name is a button stretched
 * over its row, so the whole row opens the sheet and the keyboard reaches it.
 */
export function StrategyTable({
  strategies,
  tradeCounts,
  openId,
  onOpen,
}: {
  strategies: Strategy[];
  /** Trades and missed setups holding each strategy, by id; missing means none. */
  tradeCounts: Map<number, number>;
  openId: number | null;
  onOpen: (strategyId: number) => void;
}) {
  // `relative` makes the scroll box the containing block of the stretched
  // buttons, or they would widen the page at 390 px.
  return (
    <div className="relative overflow-x-auto rounded-xl border">
      <table className="w-full text-sm [&_th]:whitespace-nowrap">
        <thead>
          <tr className="border-b bg-muted/30 text-left text-muted-foreground text-xs">
            <th className="px-4 py-2 font-normal">Strategy</th>
            <th className="px-4 py-2 font-normal">Status</th>
            <th className="px-4 py-2 text-right font-normal">Chapters</th>
            <th className="px-4 py-2 text-right font-normal">Assigned</th>
            <th className="w-8">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody onKeyDown={moveRowFocus}>
          {strategies.map((strategy) => {
            const written = STRATEGY_CHAPTERS.filter(
              (chapter) => strategy[chapter.key] !== null,
            ).length;
            return (
              <tr
                key={strategy.id}
                aria-current={strategy.id === openId ? "true" : undefined}
                className="group relative border-b align-top transition-colors duration-150 last:border-b-0 hover:bg-accent has-focus-visible:bg-accent has-focus-visible:ring-3 has-focus-visible:ring-ring/50 aria-current:bg-muted"
              >
                <td className="min-w-48 px-4 py-2.5">
                  <button
                    type="button"
                    data-row
                    onClick={() => onOpen(strategy.id)}
                    className="text-left outline-none after:absolute after:inset-0"
                  >
                    {strategy.name}
                  </button>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  {strategy.archivedAt === null ? (
                    "Active"
                  ) : (
                    <span className="text-muted-foreground">Archived</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono tabular-nums">
                  {written} / {STRATEGY_CHAPTERS.length}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono tabular-nums">
                  {tradeCounts.get(strategy.id) ?? 0}
                </td>
                <td className="py-2.5 pr-3">
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 text-muted-foreground transition-[translate] duration-150 group-hover:translate-x-0.5"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

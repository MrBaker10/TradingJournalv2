"use client";

import {
  ChevronCell,
  OpenColumnHead,
  ROW_OPENER,
  TABLE_BOX,
  TABLE_HEAD_CELL,
  TABLE_HEAD_ROW,
  TABLE_ROW,
} from "@/components/ui/dense-table";
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
  return (
    <div className={TABLE_BOX}>
      <table className="w-full text-sm [&_th]:whitespace-nowrap">
        <thead>
          <tr className={TABLE_HEAD_ROW}>
            <th className={TABLE_HEAD_CELL}>Strategy</th>
            <th className={TABLE_HEAD_CELL}>Status</th>
            <th className={`${TABLE_HEAD_CELL} text-right`}>Chapters</th>
            <th className={`${TABLE_HEAD_CELL} text-right`}>Assigned</th>
            <OpenColumnHead />
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
                className={`${TABLE_ROW} align-top last:border-b-0`}
              >
                <td className="min-w-48 px-4 py-2.5">
                  <button
                    type="button"
                    data-row
                    onClick={() => onOpen(strategy.id)}
                    className={ROW_OPENER}
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
                <ChevronCell />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

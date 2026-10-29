"use client";

import { Archive, ArchiveRestore, ChevronRight, Pencil } from "lucide-react";
import { useLocale } from "next-intl";
import { useState, useTransition } from "react";
import { setStrategyArchived } from "@/actions/strategies";
import { DrawnCheck } from "@/components/trades/form-blocks";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { runWithToast } from "@/components/ui/toast";
import type { Strategy, StrategyTradeRow } from "@/db/queries/strategies";
import { useRetainedTarget } from "@/hooks/use-retained-target";
import { Link } from "@/lib/i18n/navigation";
import { formatDateWithYear } from "@/lib/time";
import { STRATEGY_ARCHIVE_FAILED } from "@/schemas/strategies";
import { StrategyForm } from "./strategy-form";
import { StrategyRules } from "./strategy-rules";

/** What the sheet shows: one strategy, or the empty form for a new one. */
export type StrategySheetTarget =
  | { kind: "strategy"; strategy: Strategy; trades: StrategyTradeRow[] }
  | { kind: "new" };

/** Which state of one target the sheet is in. */
type Mode =
  | { kind: "detail" }
  | { kind: "form" }
  | { kind: "saved"; edited: boolean; name: string };

function keyOf(target: StrategySheetTarget): string {
  return target.kind === "new" ? "new" : `strategy:${target.strategy.id}`;
}

/**
 * The strategies page's one sheet (Design.md §3.4, §3.10, medium): a
 * strategy's rules and assigned trades read from its rows, the form for a new
 * or an existing strategy, and the saved state that confirms the action.
 */
export function StrategySheet({
  target,
  onClose,
}: {
  target: StrategySheetTarget | null;
  onClose: () => void;
}) {
  const view = useRetainedTarget(target, keyOf);

  return (
    <Sheet open={target !== null} onOpenChange={(next) => !next && onClose()}>
      <SheetContent size="medium" className="p-6">
        {view && (
          <StrategySheetBody
            key={keyOf(view)}
            target={view}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function StrategySheetBody({
  target,
  onClose,
}: {
  target: StrategySheetTarget;
  onClose: () => void;
}) {
  const strategy = target.kind === "strategy" ? target.strategy : null;
  const [mode, setMode] = useState<Mode>(
    strategy ? { kind: "detail" } : { kind: "form" },
  );

  if (mode.kind === "saved") {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-4 py-16 text-center"
      >
        <SheetTitle className="sr-only">Strategy saved</SheetTitle>
        <DrawnCheck />
        <p className="font-semibold text-xl tracking-tight">Strategy saved</p>
        <p className="text-muted-foreground text-sm">{mode.name}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {mode.edited && (
            <Button
              size="lg"
              className="h-10 px-4"
              onClick={() => setMode({ kind: "detail" })}
            >
              Back to strategy
            </Button>
          )}
          <Button
            size="lg"
            variant={mode.edited ? "outline" : "default"}
            className="h-10 px-4"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    );
  }

  if (mode.kind === "form") {
    return (
      <StrategyForm
        strategy={strategy}
        onCancel={strategy ? () => setMode({ kind: "detail" }) : onClose}
        onSaved={(name) =>
          setMode({ kind: "saved", edited: strategy !== null, name })
        }
      />
    );
  }

  // Detail only exists for a strategy.
  if (target.kind !== "strategy") return null;
  return (
    <StrategyDetail
      strategy={target.strategy}
      trades={target.trades}
      onEdit={() => setMode({ kind: "form" })}
    />
  );
}

/** A section heading in the sheet, as the journal detail's blocks have it. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
      {children}
    </h3>
  );
}

function StrategyDetail({
  strategy,
  trades,
  onEdit,
}: {
  strategy: Strategy;
  trades: StrategyTradeRow[];
  onEdit: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const language = useLocale();
  const archived = strategy.archivedAt !== null;
  const total = trades[0]?.total ?? 0;

  function changeArchived() {
    startTransition(async () => {
      await runWithToast(
        () =>
          setStrategyArchived({ strategyId: strategy.id, archived: !archived }),
        {
          success: archived ? "Strategy reactivated" : "Strategy archived",
          failed: STRATEGY_ARCHIVE_FAILED,
        },
      );
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex min-h-10 flex-col gap-1 pr-10">
        <SheetTitle className="font-semibold text-lg">
          {strategy.name}
        </SheetTitle>
        <SheetDescription>
          {archived
            ? "Archived — trades that hold it keep it; new trades cannot pick it."
            : "Active — new trades can be assigned its current rules."}
        </SheetDescription>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="lg"
          variant="outline"
          className="h-10 px-4"
          disabled={isPending}
          onClick={onEdit}
        >
          <Pencil aria-hidden="true" />
          Edit
        </Button>
        <Button
          size="lg"
          variant="ghost"
          className="h-10 px-4"
          disabled={isPending}
          onClick={changeArchived}
        >
          {archived ? (
            <ArchiveRestore aria-hidden="true" />
          ) : (
            <Archive aria-hidden="true" />
          )}
          {archived ? "Reactivate" : "Archive"}
        </Button>
      </div>

      <section className="flex flex-col gap-3 border-t pt-4">
        <SectionTitle>Rules</SectionTitle>
        <StrategyRules strategy={strategy} />
      </section>

      <section className="flex flex-col gap-3 border-t pt-4">
        <SectionTitle>
          Assigned trades
          {total > trades.length && (
            <span className="ml-2 font-mono normal-case tracking-normal tabular-nums">
              latest {trades.length} of {total}
            </span>
          )}
        </SectionTitle>
        {trades.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No trade holds this strategy yet. Pick it in a trade's Why step.
          </p>
        ) : (
          <ul className="flex flex-col">
            {trades.map((trade) => (
              <li key={trade.id}>
                <Link
                  href={`/journal/${trade.id}`}
                  className="group flex items-baseline gap-3 rounded-md border-b border-dashed px-1 py-2.5 text-sm lg:py-1.5 transition-colors duration-150 hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="shrink-0 font-mono text-muted-foreground tabular-nums">
                    {formatDateWithYear(trade.tradeDate, language)}
                  </span>
                  <span className="min-w-0 truncate font-mono">
                    {trade.instrumentSymbol}
                  </span>
                  {!trade.taken && (
                    <span className="text-muted-foreground text-xs">
                      Missed
                    </span>
                  )}
                  {!trade.onCurrentRules && (
                    <span className="text-muted-foreground text-xs">
                      Earlier rules
                    </span>
                  )}
                  <ChevronRight
                    aria-hidden="true"
                    className="ml-auto size-4 shrink-0 self-center text-muted-foreground transition-[translate] duration-150 group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

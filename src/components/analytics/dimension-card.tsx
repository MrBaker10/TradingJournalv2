"use client";

import { Maximize2 } from "lucide-react";
import {
  DIMENSION_TITLES,
  type DimensionId,
  type DimensionRow,
} from "@/domain/analytics";
import { toPercent } from "@/lib/analytics/columns";
import { formatR } from "@/lib/analytics/format";
import { moneyTone } from "@/lib/dashboard/sign-tone";
import { type DisplayCurrency, formatCents } from "@/lib/money";
import { useOpenDimension } from "./dimension-sheet";
import { CARD_SURFACE, OPENS_SHEET } from "./surface";
import { barFill, ThinBar } from "./thin-bar";

/** Buckets a card shows before "+n more"; the sheet has the rest. */
const CARD_ROW_COUNT = 5;

/**
 * One dimension as a small card (Design.md §3.7): its top buckets by net P&L
 * with avg R beside it and a thin bar under each row. Not set keeps its
 * figures but has no bar. The whole card opens the detail sheet; it holds no
 * other control, so it can be one button.
 */
export function DimensionCard({
  dimension,
  rows,
  currency,
}: {
  dimension: DimensionId;
  /** As `buildDimensionRows` sorts them: by net P&L, Not set last. */
  rows: DimensionRow[];
  currency: DisplayCurrency;
}) {
  const openDimension = useOpenDimension();
  const shown = rows.slice(0, CARD_ROW_COUNT);

  return (
    <button
      type="button"
      onClick={(event) => openDimension(dimension, event.currentTarget)}
      className={`flex flex-col gap-3 text-card-foreground ${CARD_SURFACE} ${OPENS_SHEET}`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm">
          {DIMENSION_TITLES[dimension]}
        </span>
        <Maximize2
          aria-hidden="true"
          className="h-3.5 w-3.5 text-muted-foreground"
        />
      </span>
      <span className="flex flex-col gap-2">
        {shown.map((row) => (
          <span key={row.label} className="flex flex-col gap-1 text-xs">
            <span className="grid grid-cols-[minmax(0,1fr)_auto_3.5rem] items-baseline gap-2">
              <span
                className={`truncate ${row.isNotSet ? "text-muted-foreground italic" : ""}`}
              >
                {row.label}
              </span>
              <span
                className={`font-mono tabular-nums ${moneyTone(row.netPnlCents)}`}
              >
                {formatCents(row.netPnlCents, { signed: true, currency })}
              </span>
              <span className="text-right font-mono tabular-nums">
                {formatR(row.avgR)}
              </span>
            </span>
            {row.barRatio !== null && (
              <ThinBar
                bar={{
                  start: 0,
                  length: toPercent(row.barRatio),
                }}
                tone={barFill(row.netPnlCents, true)}
                className="h-[3px]"
              />
            )}
          </span>
        ))}
      </span>
      {rows.length > shown.length && (
        <span className="text-muted-foreground text-xs">
          +{rows.length - shown.length} more
        </span>
      )}
    </button>
  );
}

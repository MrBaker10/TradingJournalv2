"use client";

import { Maximize2 } from "lucide-react";
import {
  columnOrder,
  DIMENSION_TITLES,
  type DimensionRow,
  zeroLineLayout,
} from "@/domain/analytics";
import { axisY, columnRect } from "@/lib/analytics/columns";
import { formatShare } from "@/lib/analytics/format";
import { type DisplayCurrency, formatCents } from "@/lib/money";
import { useOpenDimension } from "./dimension-sheet";
import { CARD_SURFACE, OPENS_SHEET } from "./surface";
import { barFill } from "./thin-bar";

/**
 * Weekday or hour as columns of net P&L from a zero line (Design.md §3.7).
 * The line sits where the ratio of the largest gain to the largest loss puts
 * it, so a range of mostly gains is not half empty; the order of the columns
 * and the line are `columnOrder` and `zeroLineLayout`. Hand-built SVG without
 * a `viewBox`, positions in percent (coding-standards.md, Charts). The whole
 * chart opens the dimension's detail sheet.
 */
export function ColumnChart({
  dimension,
  rows: allRows,
  currency,
}: {
  dimension: "weekday" | "hour";
  rows: DimensionRow[];
  currency: DisplayCurrency;
}) {
  const openDimension = useOpenDimension();
  const rows = columnOrder(dimension, allRows);
  const title = DIMENSION_TITLES[dimension];

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        {title}: not recorded in this range.
      </p>
    );
  }

  const layout = zeroLineLayout(rows.map((row) => row.netPnlCents));
  // The axis runs bottom (largest loss) to top (largest gain); SVG counts y
  // from the top.
  const zeroY = axisY(layout.zero);

  return (
    <button
      type="button"
      aria-label={`${title}, open the detail`}
      onClick={(event) => openDimension(dimension, event.currentTarget)}
      className={`flex w-full flex-col gap-1 ${CARD_SURFACE} ${OPENS_SHEET}`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm">{title}</span>
        <Maximize2
          aria-hidden="true"
          className="h-3.5 w-3.5 text-muted-foreground"
        />
      </span>
      {/* overflow-visible: with only gains the zero line sits on the bottom
          edge and would otherwise be cut off. */}
      <svg className="block h-36 w-full overflow-visible" aria-hidden="true">
        {rows.map((row, index) => {
          const bar = layout.bars[index];
          if (!bar || bar.length === 0) return null;
          const rect = columnRect(bar, index, rows.length);
          return (
            <rect
              key={row.label}
              x={`${rect.x}%`}
              y={`${rect.y}%`}
              width={`${rect.width}%`}
              height={`${rect.height}%`}
              rx="2"
              className={barFill(row.netPnlCents, true)}
            >
              <title>
                {`${row.label}: ${formatCents(row.netPnlCents, { signed: true, currency })} · ${row.trades} trades · ${formatShare(row.winRate)} win rate`}
              </title>
            </rect>
          );
        })}
        <rect y={`${zeroY}%`} width="100%" height="1" className="fill-border" />
      </svg>
      <span className="flex">
        {rows.map((row) => (
          <span
            key={row.label}
            className="flex min-w-0 flex-1 flex-col items-center text-[10px] text-muted-foreground"
          >
            <span className="truncate">
              {dimension === "weekday"
                ? row.label.slice(0, 3)
                : row.label.slice(0, 2)}
            </span>
            <span className="font-mono tabular-nums">{row.trades}</span>
          </span>
        ))}
      </span>
    </button>
  );
}

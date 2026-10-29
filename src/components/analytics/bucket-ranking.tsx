"use client";

import { useLocale } from "next-intl";
import {
  DIMENSION_TITLES,
  MIN_RANKED_R_TRADES,
  type RankedBucket,
} from "@/domain/analytics";
import { dimensionName, formatR } from "@/lib/analytics/format";
import { moneyTone } from "@/lib/dashboard/sign-tone";
import { type DisplayCurrency, formatCents } from "@/lib/money";
import { useOpenDimension } from "./dimension-sheet";
import { OPENS_SHEET } from "./surface";

function RankingRow({
  bucket,
  currency,
}: {
  bucket: RankedBucket;
  currency: DisplayCurrency;
}) {
  const openDimension = useOpenDimension();
  const language = useLocale();
  const { dimension, row } = bucket;
  return (
    <li>
      <button
        type="button"
        onClick={(event) => openDimension(dimension, event.currentTarget)}
        className={`grid min-h-10 w-full grid-cols-[minmax(0,1fr)_auto_2.75rem_auto] items-end gap-x-3 rounded-md px-2 py-1.5 text-sm ${OPENS_SHEET}`}
      >
        {/* The dimension sits small above the bucket, so the bucket keeps the
            width a half-page column leaves. */}
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-muted-foreground text-xs">
            {dimensionName(DIMENSION_TITLES[dimension])}
          </span>
          <span className="truncate">{row.label}</span>
        </span>
        <span className="text-right font-mono tabular-nums">
          {formatR(row.avgR, language)}
        </span>
        <span className="text-right font-mono text-xs tabular-nums">
          n={row.rCount}
        </span>
        <span
          className={`text-right font-mono tabular-nums ${moneyTone(row.netPnlCents)}`}
        >
          {formatCents(row.netPnlCents, { signed: true, currency, language })}
        </span>
      </button>
    </li>
  );
}

/**
 * "What holds my results up, what drags them down?" (Design.md §3.7): the
 * buckets of every dimension except account by avg R, each with the R, how
 * many trades carried it and its net P&L. Which buckets and in what order is
 * `rankBuckets`; nothing here is styled as a winner.
 */
export function BucketRanking({
  holdingUp,
  dragging,
  currency,
}: {
  holdingUp: RankedBucket[];
  dragging: RankedBucket[];
  currency: DisplayCurrency;
}) {
  const sides = [
    {
      label: "Holding up",
      buckets: holdingUp,
      empty: `No bucket with ${MIN_RANKED_R_TRADES} or more trades with an R is above zero yet.`,
    },
    {
      label: "Dragging",
      buckets: dragging,
      empty: `No bucket with ${MIN_RANKED_R_TRADES} or more trades with an R is below zero.`,
    },
  ];
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {sides.map((side) => (
        <div key={side.label} className="flex min-w-0 flex-col gap-1">
          <h3 className="px-2 text-muted-foreground text-xs">{side.label}</h3>
          {side.buckets.length > 0 ? (
            <ul className="flex flex-col divide-y">
              {side.buckets.map((bucket) => (
                <RankingRow
                  key={`${bucket.dimension}-${bucket.row.label}`}
                  bucket={bucket}
                  currency={currency}
                />
              ))}
            </ul>
          ) : (
            <p className="px-2 text-muted-foreground text-xs">{side.empty}</p>
          )}
        </div>
      ))}
    </div>
  );
}

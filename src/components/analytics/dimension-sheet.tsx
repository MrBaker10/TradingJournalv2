"use client";

import { useLocale } from "next-intl";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Toggle } from "@/components/ui/toggle";
import {
  ANALYTICS_METRICS,
  type AnalyticsMetric,
  DIMENSION_NOTES,
  DIMENSION_TITLES,
  type DimensionId,
  type DimensionRow,
  detailOrder,
  metricValue,
  zeroLineLayout,
} from "@/domain/analytics";
import { useRetainedTarget } from "@/hooks/use-retained-target";
import { formatMetric, formatR, formatShare } from "@/lib/analytics/format";
import { moneyTone } from "@/lib/dashboard/sign-tone";
import { type DisplayCurrency, formatCents } from "@/lib/money";
import { barFill, ThinBar } from "./thin-bar";

type OpenDimension = (dimension: DimensionId, from: HTMLElement) => void;

const OpenDimensionContext = createContext<OpenDimension | null>(null);

/** Opens a dimension in the analytics detail sheet. */
export function useOpenDimension(): OpenDimension {
  const open = useContext(OpenDimensionContext);
  if (!open) throw new Error("useOpenDimension outside <DimensionSheet>");
  return open;
}

const SIGNED: Record<AnalyticsMetric, boolean> = {
  pnl: true,
  avgR: true,
  winRate: false,
  trades: false,
};

function MetricSwitch({
  metric,
  onChange,
}: {
  metric: AnalyticsMetric;
  onChange: (metric: AnalyticsMetric) => void;
}) {
  return (
    <fieldset aria-label="Metric" className="flex rounded-lg border p-0.5">
      {ANALYTICS_METRICS.map((item) => (
        <Toggle
          key={item.id}
          pressed={metric === item.id}
          onPressedChange={() => onChange(item.id)}
          className="h-10 text-muted-foreground aria-pressed:text-foreground lg:h-8"
        >
          {item.label}
        </Toggle>
      ))}
    </fieldset>
  );
}

function DetailBody({
  dimension,
  rows: unsorted,
  metric,
  currency,
}: {
  dimension: DimensionId;
  rows: DimensionRow[];
  metric: AnalyticsMetric;
  currency: DisplayCurrency;
}) {
  const language = useLocale();
  const rows = detailOrder(dimension, unsorted, metric);
  // Not set shows its figures but stays out of the scale (Design.md §3.7).
  const layout = zeroLineLayout(
    rows.map((row) => (row.isNotSet ? null : metricValue(row, metric))),
  );
  const note = DIMENSION_NOTES[dimension];

  return (
    <div className="flex flex-col gap-8">
      <ul className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <li
            key={row.label}
            className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_6.5rem] items-center gap-3"
          >
            <span
              className={`truncate ${row.isNotSet ? "text-muted-foreground italic" : ""}`}
            >
              {row.label}
            </span>
            <ThinBar
              bar={layout.bars[index]}
              zero={layout.zero}
              tone={barFill(metricValue(row, metric), SIGNED[metric])}
              className="h-4"
            />
            <span
              className={`text-right font-mono tabular-nums ${
                metric === "pnl" ? moneyTone(row.netPnlCents) : ""
              }`}
            >
              {formatMetric(row, metric, currency, language)}
            </span>
          </li>
        ))}
      </ul>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground text-xs">
              <th className="py-2 pr-3 font-normal">Bucket</th>
              <th className="whitespace-nowrap py-2 pl-3 text-right font-normal">
                Trades
              </th>
              <th className="whitespace-nowrap py-2 pl-3 text-right font-normal">
                Win rate
              </th>
              <th className="whitespace-nowrap py-2 pl-3 text-right font-normal">
                Net P&amp;L
              </th>
              <th className="whitespace-nowrap py-2 pl-3 text-right font-normal">
                Avg R
              </th>
              <th className="whitespace-nowrap py-2 pl-3 text-right font-normal">
                With R
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b last:border-b-0">
                <td
                  className={`py-2 pr-3 ${row.isNotSet ? "text-muted-foreground italic" : ""}`}
                >
                  {row.label}
                </td>
                <td className="whitespace-nowrap py-2 pl-3 text-right font-mono tabular-nums">
                  {row.trades}
                </td>
                <td className="whitespace-nowrap py-2 pl-3 text-right font-mono tabular-nums">
                  {formatShare(row.winRate, language)}
                </td>
                <td
                  className={`whitespace-nowrap py-2 pl-3 text-right font-mono tabular-nums ${moneyTone(row.netPnlCents)}`}
                >
                  {formatCents(row.netPnlCents, {
                    signed: true,
                    currency,
                    language,
                  })}
                </td>
                <td className="whitespace-nowrap py-2 pl-3 text-right font-mono tabular-nums">
                  {formatR(row.avgR, language)}
                </td>
                <td className="whitespace-nowrap py-2 pl-3 text-right font-mono tabular-nums">
                  {row.rCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <p className="text-muted-foreground text-xs">{note}</p>}
    </div>
  );
}

/**
 * The wide detail sheet of Analytics (Design.md §3.7, §3.10): zero-line bars,
 * the full table and the metric switch, the only place the metric switches.
 * It reads the rows the page already has; opening it issues no query. Not in
 * the URL, like the journal's detail. On close, focus goes back to whatever
 * opened it.
 */
export function DimensionSheet({
  byDimension,
  currency,
  children,
}: {
  byDimension: Record<DimensionId, DimensionRow[]>;
  currency: DisplayCurrency;
  children: ReactNode;
}) {
  // The open dimension; null closes the sheet.
  const [target, setTarget] = useState<DimensionId | null>(null);
  const dimension = useRetainedTarget(target, (id) => id);
  const [metric, setMetric] = useState<AnalyticsMetric>("pnl");
  const opener = useRef<HTMLElement | null>(null);

  const openDimension = useCallback<OpenDimension>((next, from) => {
    opener.current = from;
    setTarget(next);
  }, []);

  return (
    <OpenDimensionContext.Provider value={openDimension}>
      {children}
      <Sheet
        open={target !== null}
        onOpenChange={(next) => !next && setTarget(null)}
      >
        <SheetContent size="analytics" finalFocus={opener}>
          {dimension && (
            <div className="flex flex-col gap-6 p-4 lg:p-6">
              <div className="flex flex-wrap items-center gap-3 pr-12">
                <SheetTitle className="font-semibold text-lg">
                  {DIMENSION_TITLES[dimension]}
                </SheetTitle>
                <MetricSwitch metric={metric} onChange={setMetric} />
              </div>
              <DetailBody
                dimension={dimension}
                rows={byDimension[dimension]}
                metric={metric}
                currency={currency}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </OpenDimensionContext.Provider>
  );
}

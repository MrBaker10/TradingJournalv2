import type { AnalyticsMetric, DimensionRow } from "../../domain/analytics.ts";
import { type DisplayCurrency, formatCents } from "../money.ts";

/** An R multiple with its sign, "+1.25R"; a dash where there is none. */
export function formatR(value: number | null): string {
  if (value === null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}R`;
}

/** A 0–1 share as a whole percent; a dash where there is none. */
export function formatShare(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

/** "By setup type" → "Setup type", where the context already says "by". */
export function dimensionName(title: string): string {
  const bare = title.replace(/^By /, "");
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

/** A row's figure for the switched metric, as the detail sheet prints it. */
export function formatMetric(
  row: DimensionRow,
  metric: AnalyticsMetric,
  currency: DisplayCurrency,
): string {
  switch (metric) {
    case "pnl":
      return formatCents(row.netPnlCents, { signed: true, currency });
    case "winRate":
      return formatShare(row.winRate);
    case "avgR":
      return formatR(row.avgR);
    case "trades":
      return String(row.trades);
  }
}

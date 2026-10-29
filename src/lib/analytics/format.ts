import type { AnalyticsMetric, DimensionRow } from "../../domain/analytics.ts";
import { DEFAULT_LANGUAGE, type Language } from "../i18n/languages.ts";
import { type DisplayCurrency, formatCents } from "../money.ts";
import { formatFixed, formatPercent } from "../numbers.ts";

/** An R multiple with its sign, "+1.25R"; a dash where there is none. */
export function formatR(
  value: number | null,
  language: Language = DEFAULT_LANGUAGE,
): string {
  if (value === null) return "—";
  return `${value >= 0 ? "+" : ""}${formatFixed(value, 2, language)}R`;
}

/** A 0–1 share as a whole percent; a dash where there is none. */
export function formatShare(
  value: number | null,
  language: Language = DEFAULT_LANGUAGE,
): string {
  return value === null ? "—" : formatPercent(value, language);
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
  language: Language = DEFAULT_LANGUAGE,
): string {
  switch (metric) {
    case "pnl":
      return formatCents(row.netPnlCents, { signed: true, currency, language });
    case "winRate":
      return formatShare(row.winRate, language);
    case "avgR":
      return formatR(row.avgR, language);
    case "trades":
      return String(row.trades);
  }
}

import { buildHref, type SearchParamMap } from "../search-params.ts";

export type AnalyticsSearchParams = SearchParamMap;

/** The presets of the range filter. "all" is the default and writes no param. */
export type RangePreset = "30d" | "90d" | "month" | "all";

export function buildAnalyticsHref(
  current: AnalyticsSearchParams,
  overrides: AnalyticsSearchParams,
): string {
  return buildHref("/analytics", current, overrides);
}

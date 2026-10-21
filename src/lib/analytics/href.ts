import { buildHref, type SearchParamMap } from "../search-params.ts";

export type AnalyticsSearchParams = SearchParamMap;

export function buildAnalyticsHref(
  current: AnalyticsSearchParams,
  overrides: AnalyticsSearchParams,
): string {
  return buildHref("/analytics", current, overrides);
}

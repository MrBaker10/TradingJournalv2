import { buildHref, type SearchParamMap } from "../search-params.ts";

export type DashboardSearchParams = SearchParamMap;

/**
 * `/dashboard` with the calendar's month in the query string.
 *
 * The only parameter the page reads is `month=YYYY-MM`, and the running month
 * writes none: `buildHref` drops an `undefined`, so "the current month" is the
 * absence of a parameter rather than a value that has to stay in sync.
 */
export function buildDashboardHref(
  current: DashboardSearchParams,
  overrides: DashboardSearchParams,
): string {
  return buildHref("/dashboard", current, overrides);
}

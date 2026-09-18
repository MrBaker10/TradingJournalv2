import { buildHref, type SearchParamMap } from "../search-params.ts";

export type JournalSearchParams = SearchParamMap;

export function buildJournalHref(
  current: JournalSearchParams,
  overrides: JournalSearchParams,
): string {
  return buildHref("/journal", current, overrides);
}

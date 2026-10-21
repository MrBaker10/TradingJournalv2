import { buildHref, type SearchParamMap } from "../search-params.ts";
import { narrowingPreset } from "../time.ts";

export type JournalSearchParams = SearchParamMap;

/**
 * How many filters narrow the journal (Design.md §4.27): a range preset other
 * than "All time", a typed date range, an instrument. The sort is not a
 * filter. Typed dates win over a preset, so the two count once together.
 */
export function activeJournalFilterCount(params: JournalSearchParams): number {
  const hasDates = Boolean(params.from || params.to);
  const hasPreset = !hasDates && narrowingPreset(params.range) !== null;
  return [hasDates, hasPreset, Boolean(params.instrument)].filter(Boolean)
    .length;
}

/**
 * The overrides behind `Clear` and "Clear filters": every filter and the page
 * go, the sort stays (Design.md §4.27).
 */
export const CLEARED_JOURNAL_FILTERS: JournalSearchParams = {
  range: undefined,
  from: undefined,
  to: undefined,
  instrument: undefined,
  page: undefined,
};

export function buildJournalHref(
  current: JournalSearchParams,
  overrides: JournalSearchParams,
): string {
  return buildHref("/journal", current, overrides);
}

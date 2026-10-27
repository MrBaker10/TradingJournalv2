// The whole page state lives in the URL — search term, chips, sizes and the compare
// selection — so a reload and a shared-by-hand link both land on the same view.
// src/lib/journal/href.ts does the same job for /journal but hardcodes that
// path, so this is its own helper rather than a generalisation of it.

import { firstValue } from "../search-params.ts";

export const MAX_COMPARE = 3;

export interface PropFirmsState {
  search: string;
  tags: string[];
  /** Account sizes in whole USD, as `account_size_usd` holds them. */
  sizes: number[];
  /**
   * `size=any`: the trader chose "Any size" over the preselection. Absent when
   * the URL names no size at all, so the page may open on a linked account's.
   */
  anySize?: boolean;
  compare: number[];
}

function allValues(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function parsePropFirmsState(
  raw: Record<string, string | string[] | undefined>,
): PropFirmsState {
  const compare = allValues(raw.compare)
    .flatMap((value) => value.split(","))
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value) && value > 0);

  // Whole dollars only: "50k" or "12.5" is not a size the file can hold, and
  // parseInt would quietly read them as 50 and 12.
  const sizes = allValues(raw.size)
    .filter((value) => /^[1-9]\d*$/.test(value))
    .map((value) => Number.parseInt(value, 10));

  const state: PropFirmsState = {
    search: firstValue(raw.q)?.trim() ?? "",
    tags: allValues(raw.tag).filter((tag) => tag !== ""),
    sizes: [...new Set(sizes)],
    // Anything past the cap is dropped rather than honoured, so a hand-edited
    // URL cannot widen the comparison past what the page is built for.
    compare: [...new Set(compare)].slice(0, MAX_COMPARE),
  };
  // A named size wins over "any", so a hand-edited mix still filters.
  if (sizes.length === 0 && allValues(raw.size).includes("any")) {
    state.anySize = true;
  }
  return state;
}

/**
 * The sizes the catalogue filters by (Design.md §3.9): the ones in the URL,
 * none after an explicit "Any size", else the size of the first linked
 * account (`linkedSizes` in the accounts' order), else none.
 */
export function effectiveSizes(
  state: PropFirmsState,
  linkedSizes: number[],
): number[] {
  if (state.sizes.length > 0) return state.sizes;
  if (state.anySize) return [];
  return linkedSizes.slice(0, 1);
}

export function buildPropFirmsHref(
  state: PropFirmsState,
  overrides: Partial<PropFirmsState> = {},
): string {
  const merged = { ...state, ...overrides };
  const params = new URLSearchParams();

  if (merged.search !== "") params.set("q", merged.search);
  for (const tag of merged.tags) params.append("tag", tag);
  for (const size of merged.sizes) params.append("size", String(size));
  if (merged.anySize && merged.sizes.length === 0) params.set("size", "any");
  if (merged.compare.length > 0) {
    params.set("compare", merged.compare.join(","));
  }

  const query = params.toString();
  return query === "" ? "/prop-firms" : `/prop-firms?${query}`;
}

export function toggleTag(tags: string[], tag: string): string[] {
  return tags.includes(tag)
    ? tags.filter((value) => value !== tag)
    : [...tags, tag];
}

export function toggleSize(sizes: number[], size: number): number[] {
  return sizes.includes(size)
    ? sizes.filter((value) => value !== size)
    : [...sizes, size];
}

// Unchecking always works. Checking a fourth one does nothing — the card that
// offers it is disabled, this is the second line of defence.
export function toggleCompare(compare: number[], id: number): number[] {
  if (compare.includes(id)) {
    return compare.filter((value) => value !== id);
  }
  return compare.length >= MAX_COMPARE ? compare : [...compare, id];
}

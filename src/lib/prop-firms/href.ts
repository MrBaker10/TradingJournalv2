// The whole page state lives in the URL — search term, chips and the compare
// selection — so a reload and a shared-by-hand link both land on the same view.
// src/lib/journal/href.ts does the same job for /journal but hardcodes that
// path, so this is its own helper rather than a generalisation of it.

export const MAX_COMPARE = 3;

export interface PropFirmsState {
  search: string;
  tags: string[];
  compare: number[];
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
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

  return {
    search: firstValue(raw.q)?.trim() ?? "",
    tags: allValues(raw.tag).filter((tag) => tag !== ""),
    // Anything past the cap is dropped rather than honoured, so a hand-edited
    // URL cannot widen the comparison past what the page is built for.
    compare: [...new Set(compare)].slice(0, MAX_COMPARE),
  };
}

export function buildPropFirmsHref(
  state: PropFirmsState,
  overrides: Partial<PropFirmsState> = {},
): string {
  const merged = { ...state, ...overrides };
  const params = new URLSearchParams();

  if (merged.search !== "") params.set("q", merged.search);
  for (const tag of merged.tags) params.append("tag", tag);
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

// Unchecking always works. Checking a fourth one does nothing — the card that
// offers it is disabled, this is the second line of defence.
export function toggleCompare(compare: number[], id: number): number[] {
  if (compare.includes(id)) {
    return compare.filter((value) => value !== id);
  }
  return compare.length >= MAX_COMPARE ? compare : [...compare, id];
}

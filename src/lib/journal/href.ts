export type JournalSearchParams = Record<string, string | undefined>;

// Merges overrides into the current searchParams and drops anything left
// undefined, so every link (filters, sort, pagination) carries the rest of
// the current view's state instead of resetting it.
export function buildJournalHref(
  current: JournalSearchParams,
  overrides: JournalSearchParams,
): string {
  const merged = { ...current, ...overrides };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined && value !== "") {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `/journal?${query}` : "/journal";
}

export type SearchParamMap = Record<string, string | undefined>;

/**
 * `path` with the current searchParams, `overrides` merged in.
 *
 * A key whose override is `undefined` (or an empty string) is **dropped**, so
 * "no filter" is the absence of a parameter rather than a magic value in the
 * URL. Everything not overridden is carried forward, which is what keeps a
 * sort link from silently resetting the filters beside it.
 *
 * Shared by the journal list and the analytics page. It lived in
 * `src/lib/journal/href.ts` alone until analytics needed the identical
 * function; two copies would have meant two places to fix the day this has to
 * handle a repeated parameter.
 */
export function buildHref(
  path: string,
  current: SearchParamMap,
  overrides: SearchParamMap,
): string {
  const merged = { ...current, ...overrides };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined && value !== "") {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

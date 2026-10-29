// The interface language vocabulary (docs/adr/0008): which languages exist,
// how the cookie reads, and which language a request gets. Pure, so the proxy,
// the next-intl routing and the tests share one definition.

export const LANGUAGES = ["en", "de"] as const;

export type Language = (typeof LANGUAGES)[number];

/** English is the fallback whenever nothing else names a language. */
export const DEFAULT_LANGUAGE: Language = "en";

/** The cookie that holds a signed-out visitor's pick, per device. */
export const LANGUAGE_COOKIE = "language";

/** Whether an untrusted value is one of the languages, with no fallback. */
export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language === value);
}

/**
 * The language the browser prefers among ours: entries by descending quality,
 * ties in header order, matched on the primary subtag (`de-AT` is German).
 * `q=0` means "not this one". Null when nothing matches.
 */
export function languageFromAcceptHeader(
  header: string | null | undefined,
): Language | null {
  if (!header) {
    return null;
  }
  const ranked = header
    .split(",")
    .map((entry, index) => {
      const [tag, ...params] = entry.trim().split(";");
      const qParam = params
        .map((param) => param.trim())
        .find((param) => param.startsWith("q="));
      const quality = qParam === undefined ? 1 : Number(qParam.slice(2));
      return {
        primary: (tag ?? "").trim().split("-")[0]?.toLowerCase() ?? "",
        quality: Number.isFinite(quality) ? quality : 0,
        index,
      };
    })
    .filter((entry) => entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);
  return ranked.map((entry) => entry.primary).find(isLanguage) ?? null;
}

/** The language a path starts with (`/de`, `/de/journal`), or null. */
export function languageOfPath(pathname: string): Language | null {
  const first = pathname.split("/")[1];
  return isLanguage(first) ? first : null;
}

/** The same path under a language prefix; `/` becomes `/de`. */
export function withLanguage(language: Language, pathname: string): string {
  return pathname === "/" ? `/${language}` : `/${language}${pathname}`;
}

export interface LanguageRequest {
  pathname: string;
  /** `users.language` of the signed-in user; null when signed out. */
  storedLanguage: Language | null;
  cookie: string | null | undefined;
  acceptLanguage: string | null | undefined;
}

export type LanguageDecision =
  | { kind: "render"; language: Language }
  | { kind: "redirect"; pathname: string };

/**
 * Which language a request is served in (spec → Language resolution). A path
 * with a valid prefix is rendered in that language, whatever is stored. A path
 * without one is redirected: to the signed-in user's stored language, else to
 * the cookie, else to the browser's preference, else to English.
 */
export function resolveLanguage(request: LanguageRequest): LanguageDecision {
  const prefixed = languageOfPath(request.pathname);
  if (prefixed) {
    return { kind: "render", language: prefixed };
  }
  const language =
    request.storedLanguage ??
    (isLanguage(request.cookie) ? request.cookie : null) ??
    languageFromAcceptHeader(request.acceptLanguage) ??
    DEFAULT_LANGUAGE;
  return {
    kind: "redirect",
    pathname: withLanguage(language, request.pathname),
  };
}

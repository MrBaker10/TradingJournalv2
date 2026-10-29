// The theme vocabulary (docs/adr/0007): what the trader can pick, how the
// `theme` cookie reads, and which class <body> carries. Pure, so the root
// layout, the server action and the switch UIs share one definition.

export const THEME_PICKS = ["dark", "light", "system"] as const;

export type ThemePick = (typeof THEME_PICKS)[number];

/** The cookie that holds the pick, per device. */
export const THEME_COOKIE = "theme";

/** How the cookie is set: one year, every path, sent on top-level navigation. */
export const THEME_COOKIE_OPTIONS = {
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax",
  path: "/",
} as const;

/** Whether an untrusted value is one of the picks, with no fallback. */
export function isThemePick(value: unknown): value is ThemePick {
  return THEME_PICKS.some((pick) => pick === value);
}

/** An untrusted cookie value as a pick; anything else is the default, Dark. */
export function parseThemePick(value: string | null | undefined): ThemePick {
  return isThemePick(value) ? value : "dark";
}

/**
 * The class on <body> that selects the palette in globals.css. On `system` the
 * stylesheet picks Light or Dark by `prefers-color-scheme`.
 */
export function themeBodyClass(pick: ThemePick): string {
  return pick;
}

// Design.md §4.13: a link chip's label falls back to the domain when no
// label was given.
export function domainLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const TRADINGVIEW_HOSTS = new Set(["tradingview.com", "www.tradingview.com"]);
const SNAPSHOT_PATH = /^\/x\/([A-Za-z0-9]+)\/?$/;

/**
 * The image behind a TradingView snapshot link, or null.
 *
 * A share link `https://www.tradingview.com/x/yThC9lEo/` and its PNG
 * `https://s3.tradingview.com/snapshots/y/yThC9lEo.png` differ by a fixed
 * rule: the directory is the first character of the id, lowercased. So the
 * image URL is **derived, never discovered** — this function does no I/O, and
 * neither does its caller. The browser loads the `<img>`; the server never
 * sees the address.
 *
 * That is the whole point. `coding-standards.md` (External links on trades)
 * forbids fetching a user-supplied URL server-side, and Design.md §4.13
 * forbids a thumbnail *because* it would be such a fetch. Neither applies to
 * a string transform, so both rules stay intact. Any other host returns null
 * and the caller renders the plain chip.
 */
export function snapshotImageUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (!TRADINGVIEW_HOSTS.has(parsed.hostname)) return null;

  const match = SNAPSHOT_PATH.exec(parsed.pathname);
  if (!match) return null;

  const id = match[1];
  return `https://s3.tradingview.com/snapshots/${id[0].toLowerCase()}/${id}.png`;
}

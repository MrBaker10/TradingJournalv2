// Design.md §4.13: a link chip's label falls back to the domain when no
// label was given.
export function domainLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

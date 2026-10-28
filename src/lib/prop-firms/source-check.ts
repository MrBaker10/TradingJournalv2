// The pure half of the source check (docs/adr/0005): turn a fetched page into
// the text a curator reads, compare it with the text saved at the last data
// refresh, and report per firm. Fetching and writing files live in
// src/scripts/check-prop-firm-sources.ts.
//
// The text only has to stay identical while the page does, and read as the
// article when it changes. Regex stripping does that for the sources on the
// list (spike in .scratch/prop-firm-refresh/issues/05); it is not an HTML
// parser and does not try to be one.

export type SourceOutcome = "new" | "changed" | "unchanged" | "failed";

/** One line of the source list. */
export interface Source {
  firm: string;
  url: string;
}

export interface SourceDecision {
  outcome: SourceOutcome;
  /** Why a failed source failed: the HTTP status or the error. */
  reason?: string;
  /** Whether the fetched text replaces the saved one. */
  save: boolean;
}

export type SourceResult = Source & Omit<SourceDecision, "save">;

/** What fetching a source gave: its extracted text, or why it failed. */
export type FetchedSource = { text: string } | { failure: string };

// Page furniture: never part of the article, often different on every load
// (Freshdesk's "You may like to read" sidebar rotates).
const FURNITURE =
  /<(script|style|noscript|svg|template|head|nav|header|footer|aside|iframe)\b[\s\S]*?<\/\1>/gi;
const BLOCK_TAG =
  /<\/?(p|div|br|li|ul|ol|h[1-6]|tr|td|th|table|section|article|blockquote|pre|dt|dd)\b[^>]*>/gi;
// Intercom's "Updated over a week ago" changes with the calendar alone. An
// absolute date ("Updated 12 September 2026") is a real signal and stays.
const RELATIVE_UPDATE =
  /^updated (today|yesterday|this week|in the last hour|over .+ ago|an? .+ ago|\d+ .+ ago)$/i;
const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * The readable text of a fetched page, one block per line, ending in a line
 * break. A WordPress REST response (Apex's help center) is read from its
 * rendered title and content.
 */
export function extractText(body: string, contentType: string): string {
  if (contentType.includes("json")) {
    const article = JSON.parse(body) as {
      title?: { rendered?: string };
      content?: { rendered?: string };
    };
    return htmlToText(
      `<p>${article.title?.rendered ?? ""}</p>${article.content?.rendered ?? ""}`,
    );
  }
  const html = body.replace(/<!--[\s\S]*?-->/g, " ");
  const main =
    /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html) ??
    /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(html) ??
    /<body\b[^>]*>([\s\S]*)<\/body>/i.exec(html);
  return htmlToText(main ? main[1] : html);
}

function htmlToText(html: string): string {
  const text = decodeEntities(
    html
      .replace(FURNITURE, " ")
      .replace(BLOCK_TAG, "\n")
      .replace(/<[^>]+>/g, " "),
  );
  const lines = text
    .split("\n")
    // Zero-width characters are not `\s` and would stand as lines of their own.
    .map((line) =>
      line
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((line) => line !== "" && !RELATIVE_UPDATE.test(line));
  return lines.length > 0 ? `${lines.join("\n")}\n` : "";
}

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name) => {
    if (name.startsWith("#")) {
      const code =
        name[1] === "x" || name[1] === "X"
          ? Number.parseInt(name.slice(2), 16)
          : Number.parseInt(name.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
    }
    return ENTITIES[name.toLowerCase()] ?? entity;
  });
}

/**
 * What a run makes of one source; `saved` is null when it has no saved text
 * yet. A source that could not be read is failed, never unchanged, and its
 * saved text stays: an empty page would replace a good text with nothing.
 */
export function decideSource(
  fetched: FetchedSource,
  saved: string | null,
): SourceDecision {
  if ("failure" in fetched) {
    return { outcome: "failed", reason: fetched.failure, save: false };
  }
  if (fetched.text === "") {
    return { outcome: "failed", reason: "no text", save: false };
  }
  if (saved === null) return { outcome: "new", save: true };
  return saved === fetched.text
    ? { outcome: "unchanged", save: false }
    : { outcome: "changed", save: true };
}

/** Where a source's text is saved, relative to the snapshot directory. */
export function snapshotPath({ firm, url }: Source): string {
  // Dots stay in the URL part, so the host reads as written.
  const name = slug(url.replace(/^https:\/\//, ""), /[^a-z0-9.]+/g);
  return `${slug(firm, /[^a-z0-9]+/g)}/${name}.txt`;
}

function slug(text: string, replaced: RegExp): string {
  return text
    .toLowerCase()
    .replace(replaced, "-")
    .replace(/^-+|-+$/g, "");
}

const SUMMARY_ORDER: SourceOutcome[] = [
  "changed",
  "unchanged",
  "failed",
  "new",
];

/**
 * One summary line per firm in the order the results come, then one line per
 * source that needs reading: changed, new or failed.
 */
export function reportSourceCheck(results: SourceResult[]): string[] {
  const firms = [...new Set(results.map((result) => result.firm))];
  return firms.flatMap((firm) => {
    const firmResults = results.filter((result) => result.firm === firm);
    const counts = SUMMARY_ORDER.map((outcome) => ({
      outcome,
      count: firmResults.filter((result) => result.outcome === outcome).length,
    }))
      .filter(({ count }) => count > 0)
      .map(({ outcome, count }) => `${count} ${outcome}`);
    const details = firmResults
      .filter((result) => result.outcome !== "unchanged")
      .map(
        (result) =>
          `  ${result.outcome.padEnd(8)} ${result.url}${result.reason ? ` (${result.reason})` : ""}`,
      );
    return [`${firm}: ${counts.join(", ")}`, ...details];
  });
}

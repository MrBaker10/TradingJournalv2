// What kind of export a file is, and which column holds what.
//
// Detection reads the header row and nothing else. It is deliberately strict:
// a file it half-recognises would be worse than one it rejects, because the
// preview would show plausible rows built from the wrong columns.
//
// **Only the fill-level shape is recognised today.** The round-trip and
// TradingView headers are not written down anywhere yet, and building a
// detector against guessed column names would be building it against a
// guess. The two land here as their own functions once real exports exist;
// `ImportShape` in types.ts already carries all three names.

import type { ImportShape } from "./types.ts";

/** Where each field the fill importer needs sits in a row. */
export interface FillColumns {
  fillId: number;
  timestamp: number;
  action: number;
  quantity: number;
  price: number;
  contract: number;
}

export interface DetectedFills {
  shape: Extract<ImportShape, "fills">;
  columns: FillColumns;
}

/**
 * The columns the fill shape is recognised by, lowercased.
 *
 * These are the machine-readable columns of a Tradovate fills export, not its
 * display columns. The display pair (`Fill ID`, `Timestamp`, `B/S`) carries
 * the same values formatted for a human — and `Timestamp` is rendered in
 * whatever zone the platform is set to, which is exactly what the import must
 * not depend on. `_timestamp` is unambiguous UTC.
 */
const FILL_COLUMNS: Record<keyof FillColumns, string> = {
  fillId: "_id",
  timestamp: "_timestamp",
  action: "_action",
  quantity: "_qty",
  price: "_price",
  contract: "contract",
};

/** How many headers the error message prints before it gives up. */
const MAX_LISTED_HEADERS = 25;

function indexHeader(header: string[]): Map<string, number> {
  const byName = new Map<string, number>();
  header.forEach((name, index) => {
    const key = name.trim().toLowerCase();
    // First occurrence wins: a duplicated header is the file's problem, and
    // silently preferring the later one would be surprising.
    if (key !== "" && !byName.has(key)) byName.set(key, index);
  });
  return byName;
}

function describe(header: string[]): string {
  const listed = header.slice(0, MAX_LISTED_HEADERS).map((name) => name.trim());
  const rest = header.length - listed.length;
  const suffix = rest > 0 ? `, and ${rest} more` : "";
  return listed.length === 0 ? "no columns at all" : listed.join(", ") + suffix;
}

/**
 * The shape of a file, or a thrown error naming the headers it did find.
 *
 * The error text goes straight into the preview, so it says what was looked
 * for as well as what was there — "unrecognised file" alone leaves the user
 * with nothing to compare.
 */
export function detectShape(header: string[]): DetectedFills {
  const byName = indexHeader(header);

  const columns = {} as FillColumns;
  const missing: string[] = [];

  for (const [field, name] of Object.entries(FILL_COLUMNS)) {
    const index = byName.get(name);
    if (index === undefined) {
      missing.push(name);
    } else {
      columns[field as keyof FillColumns] = index;
    }
  }

  if (missing.length === 0) return { shape: "fills", columns };

  throw new Error(
    `This file was not recognised. A fill-level export needs the columns ` +
      `${Object.values(FILL_COLUMNS).join(", ")} — missing: ` +
      `${missing.join(", ")}. The file has: ${describe(header)}. ` +
      `Round-trip and TradingView exports are not supported yet.`,
  );
}

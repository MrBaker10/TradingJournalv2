// What kind of export a file is, and which column holds what.
//
// Detection reads the header row and nothing else. It is deliberately strict:
// a file it half-recognises would be worse than one it rejects, because the
// preview would show plausible rows built from the wrong columns.
//
// The formats are a fixed list, each built against a real export: a
// Tradovate fills export and an FTMO (MetaTrader) account history. A header
// has to match exactly one of them. The round-trip and TradingView headers are
// not written down anywhere yet, and a detector against guessed column names
// would be built against a guess; they join the list once real exports exist.

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

/** Where each field of an FTMO row sits. Every row is a whole round trip. */
export interface FtmoColumns {
  ticket: number;
  openTime: number;
  type: number;
  lots: number;
  symbol: number;
  entryPrice: number;
  stopLoss: number;
  closeTime: number;
  exitPrice: number;
  swap: number;
  commission: number;
  profit: number;
}

export interface DetectedFtmo {
  shape: Extract<ImportShape, "ftmo">;
  columns: FtmoColumns;
}

export type DetectedShape = DetectedFills | DetectedFtmo;

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

/**
 * The columns an FTMO export is recognised by, lowercased, as the German
 * MetaTrader history writes them. `Preis` appears twice — the open price and
 * the close price — so it is resolved by position, not by name.
 */
const FTMO_COLUMNS: Record<
  Exclude<keyof FtmoColumns, "entryPrice" | "exitPrice">,
  string
> = {
  ticket: "ticket",
  openTime: "öffnen",
  type: "typ",
  lots: "lots",
  symbol: "symbol",
  stopLoss: "sl",
  closeTime: "schließung",
  swap: "swap",
  commission: "kommission",
  profit: "gewinn",
};

const FTMO_PRICE = "preis";

/** The FTMO header as the error message prints it. */
const FTMO_EXPECTED = [
  "Ticket",
  "Öffnen",
  "Typ",
  "Lots",
  "Symbol",
  "Preis",
  "SL",
  "Schließung",
  "Preis",
  "Swap",
  "Kommission",
  "Gewinn",
];

/** How many headers the error message prints before it gives up. */
const MAX_LISTED_HEADERS = 25;

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function indexHeader(header: string[]): Map<string, number> {
  const byName = new Map<string, number>();
  header.forEach((name, index) => {
    const key = normalizeName(name);
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

function detectFills(byName: Map<string, number>): DetectedFills | null {
  const columns = {} as FillColumns;
  for (const [field, name] of Object.entries(FILL_COLUMNS)) {
    const index = byName.get(name);
    if (index === undefined) return null;
    columns[field as keyof FillColumns] = index;
  }
  return { shape: "fills", columns };
}

function detectFtmo(
  header: string[],
  byName: Map<string, number>,
): DetectedFtmo | null {
  const named = {} as Omit<FtmoColumns, "entryPrice" | "exitPrice">;
  for (const [field, name] of Object.entries(FTMO_COLUMNS)) {
    const index = byName.get(name);
    if (index === undefined) return null;
    named[field as keyof typeof named] = index;
  }

  // The first `Preis` is the open price, the second the close price. Both
  // are checked against the time column they belong to, so a file that has
  // them the other way round is rejected instead of read backwards.
  const prices = header.flatMap((name, index) =>
    normalizeName(name) === FTMO_PRICE ? [index] : [],
  );
  if (prices.length !== 2) return null;
  const [entryPrice, exitPrice] = prices;
  if (
    !(named.openTime < entryPrice && entryPrice < named.closeTime) ||
    !(named.closeTime < exitPrice)
  ) {
    return null;
  }

  return { shape: "ftmo", columns: { ...named, entryPrice, exitPrice } };
}

/**
 * The shape of a file, or a thrown error naming the headers it did find.
 *
 * Exactly one format has to match. The error text goes straight into the
 * preview, so it says what was looked for as well as what was there —
 * "unrecognised file" alone leaves the user with nothing to compare.
 */
export function detectShape(header: string[]): DetectedShape {
  const byName = indexHeader(header);
  const matches = [detectFills(byName), detectFtmo(header, byName)].filter(
    (match): match is DetectedShape => match !== null,
  );

  if (matches.length === 1) return matches[0];

  if (matches.length > 1) {
    throw new Error(
      `This file matches more than one known export (` +
        `${matches.map((match) => match.shape).join(", ")}), so it is not ` +
        `clear how to read it. The file has: ${describe(header)}.`,
    );
  }

  const missing = (names: string[]) =>
    [...new Set(names)]
      .filter((name) => !byName.has(normalizeName(name)))
      .join(", ") || "none, but the Preis columns are not in place";

  throw new Error(
    `This file was not recognised. A Tradovate fills export needs the ` +
      `columns ${Object.values(FILL_COLUMNS).join(", ")} — missing: ` +
      `${missing(Object.values(FILL_COLUMNS))}. An FTMO export needs ` +
      `${FTMO_EXPECTED.join(", ")} — missing: ${missing(FTMO_EXPECTED)}. ` +
      `The file has: ${describe(header)}. ` +
      `Round-trip and TradingView exports are not supported yet.`,
  );
}

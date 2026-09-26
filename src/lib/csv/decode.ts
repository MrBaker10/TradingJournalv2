// Turning the bytes of an import file into text.
//
// Pure, no I/O; it runs in the browser like the rest of the import. The raw
// bytes are all there is: an export carries no charset, and the byte of an
// umlaut in its header differs by who saved it. An FTMO history arrives as
// UTF-8 from the web, as Windows-1252 from Excel on Windows, and as Mac Roman
// from Excel or Numbers on a Mac — there `Ö` is 0x85, which Windows-1252 reads
// as `…`, and the header `Öffnen` then matches nothing.
//
// The two 8-bit encodings cannot be told apart by their bytes alone, only by
// what they make of the header, so that is what decides (decided 2026-09-25).
// Data rows of the known formats are plain ASCII, which every candidate reads
// the same.

import { parseDelimited } from "./parse.ts";

/** Tried in this order. UTF-8 only counts when the bytes are valid UTF-8. */
const EIGHT_BIT_ENCODINGS = ["windows-1252", "macintosh"] as const;

function candidates(bytes: ArrayBuffer): string[] {
  const texts: string[] = [];
  try {
    // `fatal` throws on an invalid byte instead of substituting one silently.
    texts.push(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    // Not UTF-8; the 8-bit candidates below decide.
  }
  for (const encoding of EIGHT_BIT_ENCODINGS) {
    texts.push(new TextDecoder(encoding).decode(bytes));
  }
  return texts;
}

/** The header row of a text, parsed on its own. Throws like `parseDelimited`. */
export function headerOf(text: string): string[] {
  const end = text.search(/[\r\n]/);
  const firstLine = end === -1 ? text : text.slice(0, end);
  return parseDelimited(firstLine)[0] ?? [];
}

/**
 * The file's text in the first encoding whose header `recognises` accepts.
 *
 * When none does, the first candidate comes back — UTF-8 if the bytes are
 * valid UTF-8, else Windows-1252 — so the caller's "not recognised" message
 * shows the header the way it always has.
 */
export function decodeByHeader(
  bytes: ArrayBuffer,
  recognises: (header: string[]) => boolean,
): string {
  const texts = candidates(bytes);
  for (const text of texts) {
    let header: string[];
    try {
      header = headerOf(text);
    } catch {
      continue;
    }
    if (recognises(header)) return text;
  }
  return texts[0];
}

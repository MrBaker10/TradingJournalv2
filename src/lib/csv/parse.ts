// RFC 4180 reader — the other half of serialize.ts.
//
// Written here rather than pulled in as a dependency: the writer already lives
// in this folder and a format this small does not justify a package
// (decided when S10a was loaded, recorded in decisions.md).
//
// Pure string work, no I/O. It runs in the browser, because the raw file never
// leaves it: parsing, detection and normalisation all happen client-side and
// only the normalized rows go to the server action (current-feature.md).

import { UTF8_BOM } from "./serialize.ts";

const QUOTE = '"';
const DEFAULT_DELIMITER = ",";

/** Comma, semicolon and tab, in the order a tie is broken. */
const CANDIDATE_DELIMITERS = [",", ";", "\t"] as const;

export type Delimiter = (typeof CANDIDATE_DELIMITERS)[number];

export interface ParseOptions {
  /** Skips detection when the caller already knows. */
  delimiter?: Delimiter;
}

/**
 * Counts how many fields a candidate delimiter would split the first line
 * into, ignoring anything inside quotes.
 *
 * Quotes are the point of doing this properly: a tab-separated export with
 * `"Smith, John"` in a column has more commas than tabs on that line, and
 * counting raw characters would pick the comma.
 */
function countFields(line: string, delimiter: string): number {
  let fields = 1;
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === QUOTE) {
      if (inQuotes && line[index + 1] === QUOTE) {
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      fields += 1;
    }
  }

  return fields;
}

/**
 * The delimiter that splits the header into the most fields. A file whose
 * first line splits into one field under every candidate gets a comma, which
 * then yields a single-column file the caller can reject with a message.
 */
export function detectDelimiter(firstLine: string): Delimiter {
  let best: Delimiter = DEFAULT_DELIMITER;
  let bestCount = 1;

  for (const candidate of CANDIDATE_DELIMITERS) {
    const count = countFields(firstLine, candidate);
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }

  return best;
}

function stripBom(text: string): string {
  return text.startsWith(UTF8_BOM) ? text.slice(UTF8_BOM.length) : text;
}

/**
 * The first physical line, used for delimiter detection only. A quoted field
 * containing a newline would make this a partial line; that is fine, because
 * detection only needs enough of the header to count separators.
 */
function firstLineOf(text: string): string {
  const end = text.search(/\r?\n/);
  return end === -1 ? text : text.slice(0, end);
}

/**
 * Splits delimited text into rows of fields.
 *
 * - `\r\n` and `\n` both end a row, and a `\r\n` inside a quoted field is
 *   normalised to `\n` so a note keeps one line break rather than two.
 * - A doubled quote inside a quoted field is one quote.
 * - An unquoted field is trimmed; a quoted one is taken verbatim, because the
 *   writer quotes precisely to protect padding.
 * - A blank line is dropped. A line of nothing but delimiters is not blank —
 *   it is a row of empty fields and is kept, so a column count stays stable.
 * - An unterminated quote at the end of the file closes itself instead of
 *   throwing: a truncated download should still surrender the rows it has.
 */
export function parseDelimited(
  text: string,
  options: ParseOptions = {},
): string[][] {
  const content = stripBom(text);
  const delimiter = options.delimiter ?? detectDelimiter(firstLineOf(content));

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let quoted = false;

  function endField() {
    row.push(quoted ? field : field.trim());
    field = "";
    quoted = false;
  }

  function endRow() {
    endField();
    // A row of one empty field is a blank line; one with delimiters is not.
    const isBlank = row.length === 1 && row[0] === "";
    if (!isBlank) rows.push(row);
    row = [];
  }

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];

    if (inQuotes) {
      if (char === QUOTE) {
        if (content[index + 1] === QUOTE) {
          field += QUOTE;
          index += 1;
        } else {
          inQuotes = false;
        }
      } else if (char === "\r" && content[index + 1] === "\n") {
        field += "\n";
        index += 1;
      } else {
        field += char;
      }
      continue;
    }

    if (char === QUOTE) {
      inQuotes = true;
      quoted = true;
    } else if (char === delimiter) {
      endField();
    } else if (char === "\n") {
      endRow();
    } else if (char === "\r") {
      if (content[index + 1] === "\n") index += 1;
      endRow();
    } else {
      field += char;
    }
  }

  // Whatever is still buffered is the last row, unless the file ended on a
  // row separator and left nothing behind.
  if (field !== "" || quoted || row.length > 0) {
    endRow();
  }

  return rows;
}

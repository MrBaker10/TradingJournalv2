// RFC 4180 writer. Pure string work, no I/O — the route handler feeds it rows
// and hands the result to the response.
//
// The matching reader lands next to this file when the import slice (S10b)
// starts; keeping both halves of the format in one folder is the point of
// src/lib/csv/ existing at all.

/**
 * Excel decides a UTF-8 file's encoding from this byte order mark. Without it
 * an exported note with an umlaut opens as mojibake, which is the one thing a
 * backup file may not do.
 */
export const UTF8_BOM = "﻿";

const DELIMITER = ",";
const ROW_SEPARATOR = "\r\n";

// A field is quoted as soon as it carries the delimiter, a quote or a line
// break — that is RFC 4180. The leading/trailing space case is not in the
// spec: unquoted, a space survives the file but not every reader, and a
// trailing space in an account name would silently break the positional
// alignment between the `accounts` and `is_practice` columns.
function needsQuoting(field: string): boolean {
  return (
    field.includes(DELIMITER) ||
    field.includes('"') ||
    field.includes("\r") ||
    field.includes("\n") ||
    field !== field.trim()
  );
}

function escapeField(field: string): string {
  if (!needsQuoting(field)) {
    return field;
  }
  return `"${field.replaceAll('"', '""')}"`;
}

/**
 * Rows to a CSV document, BOM first, CRLF between rows and a trailing CRLF so
 * the last record is terminated like every other one.
 *
 * Rows are written as given: this does not pad short rows or check that every
 * row has the same length. The caller builds rows from one column list, so a
 * mismatch is a bug there, not something to paper over here.
 */
export function toCsv(rows: readonly (readonly string[])[]): string {
  const body = rows
    .map((row) => row.map(escapeField).join(DELIMITER))
    .join(ROW_SEPARATOR);

  return rows.length === 0 ? UTF8_BOM : `${UTF8_BOM}${body}${ROW_SEPARATOR}`;
}

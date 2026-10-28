import type { JournalDayValues, JournalSortBy } from "@/db/queries/trades";

export interface JournalDayGroup<Row> extends JournalDayValues {
  rows: Row[];
}

export type JournalLayout<Row> =
  | { kind: "flat"; rows: Row[] }
  | { kind: "days"; days: JournalDayGroup<Row>[] };

/**
 * How the journal list lays out one page (Design-v1.md §4.27).
 *
 * Sorted by R the list stays flat: day headings would tear the best and worst
 * trades apart. Sorted by date, rows are grouped by trade date in the order
 * the query returned them, so ascending stays ascending. A heading carries the
 * whole day's values, not a count of the rows on this page — a day cut by the
 * page boundary heads both halves with the same numbers.
 */
export function journalLayout<Row extends { tradeDate: string }>(
  rows: Row[],
  days: JournalDayValues[],
  sortBy: JournalSortBy,
): JournalLayout<Row> {
  if (sortBy === "r") return { kind: "flat", rows };

  const valuesByDate = new Map(days.map((day) => [day.date, day]));
  const groups: JournalDayGroup<Row>[] = [];

  for (const row of rows) {
    const current = groups.at(-1);
    if (current?.date === row.tradeDate) {
      current.rows.push(row);
      continue;
    }
    const values = valuesByDate.get(row.tradeDate);
    // A missing entry is a query bug; a heading of zero would hide it.
    if (values === undefined) {
      throw new Error(`No day values for trade date ${row.tradeDate}`);
    }
    groups.push({ ...values, rows: [row] });
  }

  return { kind: "days", days: groups };
}

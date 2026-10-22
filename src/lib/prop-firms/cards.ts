// The Prop Firm Rules page lists one card per firm (Design.md §4.28), while
// search and chips filter programs. This turns the filtered program rows into
// those cards. Pure, so the page logic is tested without a database.

import { formatCentsThousands } from "../money.ts";

interface CardRow {
  firm: { id: number };
  program: { id: number; accountSizeCents: number | null };
}

export interface FirmCard<Row extends CardRow> {
  firm: Row["firm"];
  /** The firm's programs that passed the filters, in the order of the rows. */
  programs: Row["program"][];
  /** The program the card opens on; the card's own size choice overrides it. */
  preselectedId: number;
}

// The spec's order: a program of this firm in compare (the one picked first),
// else the single filtered size, else the smallest matching size, else the
// first program by position. The second step needs no code: with one size
// filtered, every program left on the card is that size, so the smallest is it.
function preselect(programs: CardRow["program"][], compare: number[]): number {
  const compared = compare.find((id) =>
    programs.some((program) => program.id === id),
  );
  if (compared !== undefined) return compared;

  let smallestId = programs[0].id;
  let smallestCents: number | null = null;
  for (const program of programs) {
    if (program.accountSizeCents === null) continue;
    // Strictly smaller, so of two equal sizes the earlier position wins.
    if (smallestCents === null || program.accountSizeCents < smallestCents) {
      smallestId = program.id;
      smallestCents = program.accountSizeCents;
    }
  }
  return smallestId;
}

/**
 * Groups rows that arrive ordered by firm, then position. A firm with no
 * matching program gets no card at all.
 */
export function groupFirmCards<Row extends CardRow>(
  rows: Row[],
  compare: number[],
): FirmCard<Row>[] {
  const groups: { firm: Row["firm"]; programs: Row["program"][] }[] = [];

  for (const row of rows) {
    const current = groups.at(-1);
    if (current?.firm.id === row.firm.id) {
      current.programs.push(row.program);
      continue;
    }
    groups.push({ firm: row.firm, programs: [row.program] });
  }

  return groups.map((group) => ({
    ...group,
    preselectedId: preselect(group.programs, compare),
  }));
}

/**
 * The labels of a card's size control, one per program, in the same order.
 * A size label only works when every program has one and no two share it, so
 * otherwise the whole card falls back to program names — never "Unknown",
 * never two equal labels (Design.md §4.28).
 */
export function sizeLabels(
  programs: { name: string; accountSizeCents: number | null }[],
): string[] {
  const labels: string[] = [];
  for (const program of programs) {
    if (program.accountSizeCents === null) {
      return programs.map((candidate) => candidate.name);
    }
    labels.push(formatCentsThousands(program.accountSizeCents));
  }
  return new Set(labels).size === labels.length
    ? labels
    : programs.map((program) => program.name);
}

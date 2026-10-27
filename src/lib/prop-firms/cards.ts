// The Prop Firm Rules catalogue lists one card per program (Design.md §3.9).
// This orders the filtered rows into those cards. Pure, so the page logic is
// tested without a database.

import type { ProgramLink } from "../../db/queries/account-rules.ts";

interface CardRow {
  program: { id: number };
}

export type ProgramLinkName = Pick<ProgramLink, "programId" | "accountName">;

/** The real accounts linked to one program, in the accounts' order. */
export function accountNamesFor(
  links: ProgramLinkName[],
  programId: number,
): string[] {
  return links
    .filter((link) => link.programId === programId)
    .map((link) => link.accountName);
}

export interface CatalogueCard<Row extends CardRow> {
  row: Row;
  /** The real accounts linked to this program, in the accounts' order. */
  accountNames: string[];
}

/**
 * Programs a real account is linked to come first, carrying the account
 * names; otherwise the query's order (firm, then file position) holds on both
 * sides. Nothing else is ranked: the order never reads a rule.
 */
export function orderCatalogue<Row extends CardRow>(
  rows: Row[],
  links: ProgramLinkName[],
): CatalogueCard<Row>[] {
  const cards = rows.map((row) => ({
    row,
    accountNames: accountNamesFor(links, row.program.id),
  }));
  return [
    ...cards.filter((card) => card.accountNames.length > 0),
    ...cards.filter((card) => card.accountNames.length === 0),
  ];
}

import { decideDiscontinued } from "./discontinued.ts";
import {
  type ParsedFirm,
  type ParsedProgram,
  PROGRAM_FIELD_LABELS,
} from "./parse.ts";

// Whether a database holds what a seed of `context/PropFirmsData.md` leaves
// there (docs/adr/0005). The data refresh runs it after every seed, against
// production too, so it only reads and reports; a difference is never fixed
// here.
//
// A firm only the database has is not a difference of its own: the seed never
// deletes, so it stays. Its programs still on sale are reported, as the next
// seed would mark them discontinued.

/** A firm row in the shape the parser gives it. */
export type StoredFirm = Omit<ParsedFirm, "programs">;

/**
 * A program row in the shape the parser gives it, `accountSizeUsd` without
 * trailing zeros, plus what only the database has.
 */
export type StoredProgram = ParsedProgram & {
  id: number;
  firmName: string;
  discontinuedAt: Date | null;
};

export interface CatalogueRows {
  firms: StoredFirm[];
  programs: StoredProgram[];
}

export interface CatalogueDifference {
  firm: string;
  /** Null for a difference of the firm itself. */
  program: string | null;
  issue: string;
}

// File order: each firm's own fields, then its programs. What the next seed
// would change about discontinued programs comes last.
export function compareCatalogue(
  file: ParsedFirm[],
  rows: CatalogueRows,
): CatalogueDifference[] {
  return [
    ...file.flatMap((firm) => compareFirm(firm, rows)),
    ...nextSeedChanges(file, rows.programs),
  ];
}

function compareFirm(
  firm: ParsedFirm,
  rows: CatalogueRows,
): CatalogueDifference[] {
  const stored = rows.firms.find((row) => row.name === firm.name);
  if (!stored) {
    return [{ firm: firm.name, program: null, issue: "not in the database" }];
  }
  const own = [
    fieldIssue("Firm website", stored.website, firm.website),
    fieldIssue("Last verified", stored.lastVerifiedAt, firm.lastVerifiedAt),
  ]
    .filter((issue) => issue !== null)
    .map((issue) => ({ firm: firm.name, program: null, issue }));

  return [
    ...own,
    ...firm.programs.flatMap((program) =>
      compareProgram(firm.name, program, rows.programs).map((issue) => ({
        firm: firm.name,
        program: program.name,
        issue,
      })),
    ),
  ];
}

function compareProgram(
  firmName: string,
  program: ParsedProgram,
  stored: StoredProgram[],
): string[] {
  const row = stored.find(
    (candidate) =>
      candidate.firmName === firmName && candidate.name === program.name,
  );
  if (!row) return ["not in the database"];
  return [
    fieldIssue("Position", String(row.position), String(program.position)),
    fieldIssue(
      "Account size (USD)",
      row.accountSizeUsd,
      program.accountSizeUsd,
    ),
    // As lists, so ["EOD, No DLL"] and ["EOD", "No DLL"] read differently.
    sameTags(row.summaryTags, program.summaryTags)
      ? null
      : `Summary tags: database ${JSON.stringify(row.summaryTags)}, file ${JSON.stringify(program.summaryTags)}`,
    ...PROGRAM_FIELD_LABELS.map(([key, label]) =>
      fieldIssue(label, row.fields[key], program.fields[key]),
    ),
  ].filter((issue) => issue !== null);
}

// The seeder's own decision, so this reports exactly what the next seed would
// change.
function nextSeedChanges(
  file: ParsedFirm[],
  stored: StoredProgram[],
): CatalogueDifference[] {
  const { discontinue, putOnSale } = decideDiscontinued(
    file,
    stored.map((row) => ({
      id: row.id,
      firmName: row.firmName,
      programName: row.name,
      discontinuedAt: row.discontinuedAt,
    })),
  );
  const named = (ids: number[], issue: string) =>
    stored
      .filter((row) => ids.includes(row.id))
      .map((row) => ({ firm: row.firmName, program: row.name, issue }));
  return [
    ...named(putOnSale, "discontinued in the database, back in the file"),
    ...named(
      discontinue,
      "not in the file: the next seed marks it discontinued",
    ),
  ];
}

function sameTags(stored: string[], file: string[]): boolean {
  return (
    stored.length === file.length &&
    stored.every((tag, index) => tag === file[index])
  );
}

function fieldIssue(
  label: string,
  stored: string | null,
  file: string | null,
): string | null {
  if (stored === file) return null;
  return `${label}: database ${quote(stored)}, file ${quote(file)}`;
}

function quote(value: string | null): string {
  return value === null ? "empty" : `"${value}"`;
}

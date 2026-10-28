import type { ParsedFirm } from "./parse.ts";

export interface ExistingProgram {
  id: number;
  firmName: string;
  programName: string;
  discontinuedAt: Date | null;
}

export interface DiscontinuedDecision {
  /** On sale now, missing from the file: the seed marks them discontinued. */
  discontinue: number[];
  /** Discontinued now, back in the file: the seed puts them on sale again. */
  putOnSale: number[];
}

// Which programs a seed marks discontinued and which it puts back on sale
// (docs/adr/0005). The file is the source of record: a program is on sale
// exactly when its firm and name are in it. A program that is already in the
// right state is left alone, so an existing `discontinued_at` keeps its date.
export function decideDiscontinued(
  firms: ParsedFirm[],
  existing: ExistingProgram[],
): DiscontinuedDecision {
  const inFile = new Set(
    firms.flatMap((firm) =>
      firm.programs.map((program) => key(firm.name, program.name)),
    ),
  );

  const discontinue: number[] = [];
  const putOnSale: number[] = [];
  for (const program of existing) {
    const listed = inFile.has(key(program.firmName, program.programName));
    if (!listed && program.discontinuedAt === null) {
      discontinue.push(program.id);
    } else if (listed && program.discontinuedAt !== null) {
      putOnSale.push(program.id);
    }
  }
  return { discontinue, putOnSale };
}

// A tab cannot occur in a markdown heading, so it cannot join two names into
// one that collides with another pair.
function key(firmName: string, programName: string): string {
  return `${firmName}\t${programName}`;
}

import { describe, expect, it } from "vitest";
import {
  type CatalogueRows,
  compareCatalogue,
  type StoredProgram,
} from "../compare.ts";
import {
  type ParsedFirm,
  type ParsedProgram,
  PROGRAM_FIELD_LABELS,
  type ProgramFields,
} from "../parse.ts";

// Every rule field null except the ones a case sets: enough to tell a changed
// field from an unchanged one.
const FIELDS: ProgramFields = {
  ...(Object.fromEntries(
    PROGRAM_FIELD_LABELS.map(([key]) => [key, null]),
  ) as ProgramFields),
  accountSize: "$50,000",
  profitTarget: "$3,000",
};

function program(name: string, position: number): ParsedProgram {
  return {
    name,
    position,
    accountSizeUsd: "50000",
    summaryTags: ["EOD"],
    fields: FIELDS,
  };
}

const FILE: ParsedFirm[] = [
  {
    name: "Tradeify",
    website: "https://tradeify.co",
    lastVerifiedAt: "2026-10-22",
    programs: [program("Select 50k", 1), program("Select 100k", 2)],
  },
];

function stored(
  id: number,
  name: string,
  position: number,
  discontinuedAt: Date | null = null,
): StoredProgram {
  return {
    id,
    firmName: "Tradeify",
    name,
    position,
    accountSizeUsd: "50000",
    summaryTags: ["EOD"],
    fields: FIELDS,
    discontinuedAt,
  };
}

// The database exactly as a seed of FILE leaves it.
function seeded(): CatalogueRows {
  return {
    firms: [
      {
        name: "Tradeify",
        website: "https://tradeify.co",
        lastVerifiedAt: "2026-10-22",
      },
    ],
    programs: [stored(1, "Select 50k", 1), stored(2, "Select 100k", 2)],
  };
}

const SINCE = new Date("2026-10-01T00:00:00Z");

describe("compareCatalogue", () => {
  it("finds nothing when the database is what a seed of the file leaves", () => {
    expect(compareCatalogue(FILE, seeded())).toEqual([]);
  });

  it("names a changed program field with both values", () => {
    const rows = seeded();
    rows.programs[1] = {
      ...rows.programs[1],
      fields: { ...FIELDS, profitTarget: "$6,000" },
    };

    expect(compareCatalogue(FILE, rows)).toEqual([
      {
        firm: "Tradeify",
        program: "Select 100k",
        issue: 'Profit target: database "$6,000", file "$3,000"',
      },
    ]);
  });

  it("compares summary tags one by one, not as joined text", () => {
    const rows = seeded();
    rows.programs[0] = { ...rows.programs[0], summaryTags: ["EOD", "No DLL"] };
    const file: ParsedFirm[] = [
      {
        ...FILE[0],
        programs: [
          { ...program("Select 50k", 1), summaryTags: ["EOD, No DLL"] },
          program("Select 100k", 2),
        ],
      },
    ];

    expect(compareCatalogue(file, rows)).toEqual([
      {
        firm: "Tradeify",
        program: "Select 50k",
        issue: 'Summary tags: database ["EOD","No DLL"], file ["EOD, No DLL"]',
      },
    ]);
  });

  it("names a changed firm field", () => {
    const rows = seeded();
    rows.firms[0] = { ...rows.firms[0], lastVerifiedAt: "2026-09-01" };

    expect(compareCatalogue(FILE, rows)).toEqual([
      {
        firm: "Tradeify",
        program: null,
        issue: 'Last verified: database "2026-09-01", file "2026-10-22"',
      },
    ]);
  });

  it("names a program the database is missing, and a firm", () => {
    const rows = seeded();
    rows.programs.pop();
    const file: ParsedFirm[] = [
      ...FILE,
      {
        name: "Apex Trader Funding",
        website: null,
        lastVerifiedAt: null,
        programs: [],
      },
    ];

    expect(compareCatalogue(file, rows)).toEqual([
      {
        firm: "Tradeify",
        program: "Select 100k",
        issue: "not in the database",
      },
      {
        firm: "Apex Trader Funding",
        program: null,
        issue: "not in the database",
      },
    ]);
  });

  it("names an extra program on sale as one the next seed marks discontinued", () => {
    // A forgotten rename looks exactly like this: the old name is still on
    // sale in the database, the new one is missing.
    const rows = seeded();
    rows.programs.push(stored(3, "Select 25k", 3));

    expect(compareCatalogue(FILE, rows)).toEqual([
      {
        firm: "Tradeify",
        program: "Select 25k",
        issue: "not in the file: the next seed marks it discontinued",
      },
    ]);
  });

  it("accepts an extra program that is already discontinued", () => {
    const rows = seeded();
    rows.programs.push(stored(3, "Select 25k", 3, SINCE));

    expect(compareCatalogue(FILE, rows)).toEqual([]);
  });

  it("names a discontinued program that is back in the file", () => {
    const rows = seeded();
    rows.programs[0] = { ...rows.programs[0], discontinuedAt: SINCE };

    expect(compareCatalogue(FILE, rows)).toEqual([
      {
        firm: "Tradeify",
        program: "Select 50k",
        issue: "discontinued in the database, back in the file",
      },
    ]);
  });
});

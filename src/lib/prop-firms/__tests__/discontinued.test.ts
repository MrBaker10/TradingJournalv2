import { describe, expect, it } from "vitest";
import { decideDiscontinued } from "../discontinued.ts";
import type { ParsedFirm } from "../parse.ts";

// The file as the parser returns it, cut down to what the decision reads.
function file(firms: Record<string, string[]>): ParsedFirm[] {
  return Object.entries(firms).map(([name, programs]) => ({
    name,
    website: null,
    lastVerifiedAt: null,
    programs: programs.map((programName, index) => ({
      name: programName,
      position: index + 1,
      accountSizeUsd: null,
      summaryTags: [],
      fields: {} as ParsedFirm["programs"][number]["fields"],
    })),
  }));
}

const SINCE = new Date("2026-09-01T00:00:00Z");

const EXISTING = [
  { id: 1, firmName: "Apex", programName: "EOD 50k", discontinuedAt: null },
  { id: 2, firmName: "Apex", programName: "EOD 100k", discontinuedAt: null },
  {
    id: 3,
    firmName: "Topstep",
    programName: "Combine 50k",
    discontinuedAt: null,
  },
];

describe("decideDiscontinued", () => {
  it("marks a program missing from the file", () => {
    const decision = decideDiscontinued(
      file({ Apex: ["EOD 50k"], Topstep: ["Combine 50k"] }),
      EXISTING,
    );

    expect(decision).toEqual({ discontinue: [2], putOnSale: [] });
  });

  it("marks every program of a firm missing from the file", () => {
    const decision = decideDiscontinued(
      file({ Topstep: ["Combine 50k"] }),
      EXISTING,
    );

    expect(decision).toEqual({ discontinue: [1, 2], putOnSale: [] });
  });

  it("puts a program back on sale once it is in the file again", () => {
    const decision = decideDiscontinued(
      file({ Apex: ["EOD 50k", "EOD 100k"], Topstep: ["Combine 50k"] }),
      [EXISTING[0], { ...EXISTING[1], discontinuedAt: SINCE }, EXISTING[2]],
    );

    expect(decision).toEqual({ discontinue: [], putOnSale: [2] });
  });

  it("changes nothing when the file is unchanged", () => {
    const decision = decideDiscontinued(
      file({ Apex: ["EOD 50k"], Topstep: ["Combine 50k"] }),
      [EXISTING[0], { ...EXISTING[1], discontinuedAt: SINCE }, EXISTING[2]],
    );

    expect(decision).toEqual({ discontinue: [], putOnSale: [] });
  });

  it("matches on firm and program name together", () => {
    // The same program name at another firm does not keep this one on sale.
    const decision = decideDiscontinued(
      file({ Apex: ["Combine 50k", "EOD 50k", "EOD 100k"] }),
      EXISTING,
    );

    expect(decision).toEqual({ discontinue: [3], putOnSale: [] });
  });
});

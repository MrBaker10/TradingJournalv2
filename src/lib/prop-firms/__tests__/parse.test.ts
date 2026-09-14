import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePropFirms } from "../parse.ts";

// A minimal block in exactly the shape the real file uses: heading, program
// name, the summary lines, the broken-off "target" line, then label/value pairs.
function block(name: string, body: string): string {
  return `## ${name}\n\nRapid 50k\n\nEOD\n90% split\nNo DLL\n$3,000\n\ntarget\n\n\n${body}\n`;
}

const FULL_BODY = [
  "Account size",
  "$50,000",
  "Profit target",
  "$3,000",
  "Max drawdown",
  "$2,000 (EOD)",
  "Daily loss limit",
  "None",
  "Min trading days",
  "2",
  "Consistency rule",
  "50% eval only; none once funded",
  "Consistency when funded",
  "None once funded",
  "News trading",
  "Eval: yes. Funded: Tier 1 news NOT allowed",
  "Overnight",
  "Not allowed",
  "Copy trading",
  "Not stated officially",
  "First payout",
  "24 hours after first funded trade",
  "Payout cycle",
  "Daily (every 24h)",
  "Max payout / cycle",
  "No stated cap",
  "Profit split",
  "90%",
  "Live program",
  "Rapid Live",
  "Scaling",
  "4 minis / 40 micros max",
  "End-of-day rule",
  "All positions must be closed before daily session close",
  "Notes",
  "Min payout $500.",
].join("\n");

describe("parsePropFirms", () => {
  it("reads firm, program, summary tags and all eighteen fields", () => {
    const [firm] = parsePropFirms(block("My Funded Futures", FULL_BODY));

    expect(firm.name).toBe("My Funded Futures");
    expect(firm.programs).toHaveLength(1);

    const program = firm.programs[0];
    expect(program.name).toBe("Rapid 50k");
    expect(program.fields.accountSize).toBe("$50,000");
    expect(program.fields.maxDrawdown).toBe("$2,000 (EOD)");
    expect(program.fields.minTradingDays).toBe("2");
    expect(program.fields.maxPayoutCycle).toBe("No stated cap");
    expect(program.fields.notes).toBe("Min payout $500.");
    expect(
      Object.values(program.fields).filter((v) => v === null),
    ).toHaveLength(0);
  });

  it("joins the broken-off 'target' line onto the preceding summary tag", () => {
    const [firm] = parsePropFirms(block("My Funded Futures", FULL_BODY));

    expect(firm.programs[0].summaryTags).toEqual([
      "EOD",
      "90% split",
      "No DLL",
      "$3,000 target",
    ]);
  });

  it("keeps a rule field verbatim, contradiction and all", () => {
    const contradiction =
      "Eval only (40% per FAQ / 51% per app - firm's pages conflict); none once funded";
    const body = FULL_BODY.replace(
      "50% eval only; none once funded",
      contradiction,
    );

    const [firm] = parsePropFirms(block("Futures Elite", body));

    expect(firm.programs[0].fields.consistencyRule).toBe(contradiction);
  });

  it("treats a label with no value as unknown, not as an empty string", () => {
    // Take Profit Trader ends its block with a bare "Firm website" label.
    const [firm] = parsePropFirms(
      block("Take Profit Trader", `${FULL_BODY}\nFirm website`),
    );

    expect(firm.website).toBeNull();
    expect(firm.lastVerifiedAt).toBeNull();
  });

  it("lifts website and last-verified date onto the firm", () => {
    const body = `${FULL_BODY}\nFirm website\nhttps://example.com\nLast verified\n2026-09-14`;
    const [firm] = parsePropFirms(block("Tradeify", body));

    expect(firm.website).toBe("https://example.com");
    expect(firm.lastVerifiedAt).toBe("2026-09-14");
    expect(firm.programs[0].fields.notes).toBe("Min payout $500.");
  });

  it("rejects a non-https website", () => {
    const body = `${FULL_BODY}\nFirm website\nhttp://example.com`;

    expect(() => parsePropFirms(block("Tradeify", body))).toThrow(
      /must be https/,
    );
  });

  it("rejects a malformed last-verified date", () => {
    const body = `${FULL_BODY}\nLast verified\n14.09.2026`;

    expect(() => parsePropFirms(block("Tradeify", body))).toThrow(
      /must be a YYYY-MM-DD date/,
    );
  });

  it("rejects a last-verified date that does not exist", () => {
    const body = `${FULL_BODY}\nLast verified\n2026-02-30`;

    expect(() => parsePropFirms(block("Tradeify", body))).toThrow(
      /must be a YYYY-MM-DD date/,
    );
  });

  it("throws on a line it cannot place instead of dropping it", () => {
    const body = FULL_BODY.replace("Profit split", "Profit split ratio");

    expect(() => parsePropFirms(block("Tradeify", body))).toThrow(
      /is neither a known field label nor a value under one/,
    );
  });

  it("reports the line number and the firm when it throws", () => {
    expect(() => parsePropFirms(block("Tradeify", "Account size\n$50,000\n?"))) //
      .toThrow(/PropFirmsData\.md line \d+: "\?" in firm "Tradeify"/);
  });

  it("throws when the first label lost the line above it", () => {
    // "Account size" is gone, so its value would otherwise be swallowed as a
    // summary tag and the field would silently end up null.
    const body = FULL_BODY.replace("Account size\n", "");

    expect(() => parsePropFirms(block("Tradeify", body))).toThrow(
      /"Profit target" opens the rule table of "Tradeify" but shares its paragraph with "\$50,000" — the line above it has lost its label/,
    );
  });

  it("insists on the blank line between the summary block and the rule table", () => {
    // Deliberate brittleness: blank lines carry the structure of this file, so
    // losing one is a parse error rather than something to guess around.
    const glued = `## Tradeify\n\nRapid 50k\n\nEOD\n90% split\n\ntarget\n${FULL_BODY}\n`;

    expect(() => parsePropFirms(glued)).toThrow(/has lost its label/);
  });

  it("rejects a duplicate label", () => {
    const body = `${FULL_BODY}\nProfit split\n80%`;

    expect(() => parsePropFirms(block("Tradeify", body))).toThrow(
      /duplicate label "Profit split"/,
    );
  });

  it("rejects a duplicate firm heading", () => {
    const markdown =
      block("Tradeify", FULL_BODY) + block("Tradeify", FULL_BODY);

    expect(() => parsePropFirms(markdown)).toThrow(/duplicate firm heading/);
  });

  it("rejects content before the first heading", () => {
    expect(() => parsePropFirms(`stray\n\n${block("Tradeify", FULL_BODY)}`)) //
      .toThrow(/content before the first "## " heading/);
  });
});

describe("parsePropFirms against context/PropFirmsData.md", () => {
  const markdown = readFileSync(
    join(process.cwd(), "context/PropFirmsData.md"),
    "utf8",
  );

  it("parses all fifteen firms with one program each", () => {
    const firms = parsePropFirms(markdown);

    expect(firms).toHaveLength(15);
    expect(firms.every((firm) => firm.programs.length === 1)).toBe(true);
    expect(firms.map((firm) => firm.name)).toContain("The Trading Pit");
  });

  it("fills every one of the eighteen rule fields for every program", () => {
    for (const firm of parsePropFirms(markdown)) {
      const missing = Object.entries(firm.programs[0].fields)
        .filter(([, value]) => value === null)
        .map(([key]) => key);

      expect(missing, `${firm.name} is missing fields`).toEqual([]);
    }
  });

  it("has no website and no verification date on file yet", () => {
    const firms = parsePropFirms(markdown);

    expect(firms.every((firm) => firm.website === null)).toBe(true);
    expect(firms.every((firm) => firm.lastVerifiedAt === null)).toBe(true);
  });

  it("yields the summary tags the filter chips are built from", () => {
    const firms = parsePropFirms(markdown);
    const byName = new Map(firms.map((firm) => [firm.name, firm]));

    expect(byName.get("E8 Markets")?.programs[0].summaryTags).toEqual([
      "Static",
      "80% split",
      "$3,000 target",
    ]);
    expect(byName.get("Tradeify")?.programs[0].summaryTags).toEqual([
      "EOD",
      "90% split",
      "No DLL",
      "No funded consistency",
      "$3,000 target",
    ]);

    const tags = new Set(firms.flatMap((firm) => firm.programs[0].summaryTags));
    expect(tags.has("target")).toBe(false);
  });
});

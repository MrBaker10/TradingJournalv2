import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePropFirms } from "../parse.ts";

// A program in exactly the shape the real file uses: its heading, the summary
// lines, then the label/value pairs of the rule table.
function program(name: string, body: string): string {
  return `### ${name}\n\nEOD\n90% split\nNo DLL\n\n${body}\n\n`;
}

// A firm block with one program, optionally preceded by firm fields.
function block(name: string, body: string, firmFields = ""): string {
  const head = firmFields === "" ? "" : `${firmFields}\n\n`;
  return `## ${name}\n\n${head}${program("Rapid 50k", body)}`;
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

  it("reads several programs of one firm in file order, numbered from 1", () => {
    const markdown = `## Tradeify\n\n${program("Select 25k", FULL_BODY)}${program("Select 50k", FULL_BODY)}${program("Select 100k", FULL_BODY)}`;

    const [firm] = parsePropFirms(markdown);

    expect(firm.programs.map(({ name, position }) => [name, position])).toEqual(
      [
        ["Select 25k", 1],
        ["Select 50k", 2],
        ["Select 100k", 3],
      ],
    );
  });

  it("reads the summary tags verbatim", () => {
    const [firm] = parsePropFirms(block("My Funded Futures", FULL_BODY));

    expect(firm.programs[0].summaryTags).toEqual([
      "EOD",
      "90% split",
      "No DLL",
    ]);
  });

  it.each(["$3,000 target", "50k EOD", "100K"])(
    "rejects the size-bound summary tag %j",
    (tag) => {
      const markdown = `## Tradeify\n\n### Select 50k\n\nEOD\n${tag}\n\n${FULL_BODY}\n`;

      expect(() => parsePropFirms(markdown)).toThrow(
        /summary tag .* of program "Select 50k" of firm "Tradeify" names an amount or a size/,
      );
    },
  );

  it.each([
    ["$50,000", "50000"],
    ["$150,000", "150000"],
  ])("reads the account size %s as %s USD", (text, usd) => {
    const body = FULL_BODY.replace("$50,000", text);

    const [firm] = parsePropFirms(block("Tradeify", body));

    expect(firm.programs[0].accountSizeUsd).toBe(usd);
    expect(firm.programs[0].fields.accountSize).toBe(text);
  });

  it("leaves an unknown account size null", () => {
    const body = FULL_BODY.replace("Account size\n$50,000\n", "Account size\n");

    const [firm] = parsePropFirms(block("Tradeify", body));

    expect(firm.programs[0].accountSizeUsd).toBeNull();
  });

  it.each(["50k", "$50,000 (EOD)", "$50.000", "$050,000"])(
    "rejects the account size %j",
    (text) => {
      const body = FULL_BODY.replace("$50,000", text);

      expect(() => parsePropFirms(block("Tradeify", body))).toThrow(
        /PropFirmsData\.md line \d+: "Account size" of program "Rapid 50k" of firm "Tradeify" must be a dollar amount like "\$50,000"/,
      );
    },
  );

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
    // Take Profit Trader carries a bare "Firm website" label.
    const [firm] = parsePropFirms(
      block("Take Profit Trader", FULL_BODY, "Firm website"),
    );

    expect(firm.website).toBeNull();
    expect(firm.lastVerifiedAt).toBeNull();
  });

  it("lifts website and last-verified date onto the firm", () => {
    const [firm] = parsePropFirms(
      block(
        "Tradeify",
        FULL_BODY,
        "Firm website\nhttps://example.com\nLast verified\n2026-09-14",
      ),
    );

    expect(firm.website).toBe("https://example.com");
    expect(firm.lastVerifiedAt).toBe("2026-09-14");
    expect(firm.programs[0].fields.notes).toBe("Min payout $500.");
  });

  it("rejects a non-https website", () => {
    expect(() =>
      parsePropFirms(
        block("Tradeify", FULL_BODY, "Firm website\nhttp://example.com"),
      ),
    ).toThrow(/must be https/);
  });

  it("rejects a malformed last-verified date", () => {
    expect(() =>
      parsePropFirms(block("Tradeify", FULL_BODY, "Last verified\n14.09.2026")),
    ).toThrow(/must be a YYYY-MM-DD date/);
  });

  it("rejects a last-verified date that does not exist", () => {
    expect(() =>
      parsePropFirms(block("Tradeify", FULL_BODY, "Last verified\n2026-02-30")),
    ).toThrow(/must be a YYYY-MM-DD date/);
  });

  it("throws on a line it cannot place instead of dropping it", () => {
    const body = FULL_BODY.replace("Profit split", "Profit split ratio");

    expect(() => parsePropFirms(block("Tradeify", body))).toThrow(
      /is neither a known field label nor a value under one/,
    );
  });

  it("reports the line number, the program and the firm when it throws", () => {
    expect(() => parsePropFirms(block("Tradeify", "Account size\n$50,000\n?"))) //
      .toThrow(
        /PropFirmsData\.md line \d+: "\?" in program "Rapid 50k" of firm "Tradeify"/,
      );
  });

  it("throws when the first label lost the line above it", () => {
    // "Account size" is gone, so its value would otherwise be swallowed as a
    // summary tag and the field would silently end up null.
    const body = FULL_BODY.replace("Account size\n", "");

    expect(() => parsePropFirms(block("Tradeify", body))).toThrow(
      /"Profit target" opens the rule table of program "Rapid 50k" of firm "Tradeify" but shares its paragraph with "\$50,000" — the line above it has lost its label/,
    );
  });

  it("insists on the blank line between the summary block and the rule table", () => {
    // Deliberate brittleness: blank lines carry the structure of this file, so
    // losing one is a parse error rather than something to guess around.
    const glued = `## Tradeify\n\n### Rapid 50k\n\nEOD\n90% split\n${FULL_BODY}\n`;

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

  it("rejects a firm without a program", () => {
    expect(() => parsePropFirms("## Tradeify\n\nFirm website\n")).toThrow(
      /firm "Tradeify" has no "### " program heading/,
    );
  });

  it("rejects a program heading with no rule table under it", () => {
    const markdown = `## Tradeify\n\n### Select 25k\n\n${program("Select 50k", FULL_BODY)}`;

    expect(() => parsePropFirms(markdown)).toThrow(
      /program "Select 25k" of firm "Tradeify" has no rule table/,
    );
  });

  it("rejects a program heading before the first firm heading", () => {
    expect(() => parsePropFirms(program("Select 50k", FULL_BODY))).toThrow(
      /program heading before the first "## " firm heading/,
    );
  });

  it("rejects a duplicate program name within a firm", () => {
    const markdown = `## Tradeify\n\n${program("Select 50k", FULL_BODY)}${program("Select 50k", FULL_BODY)}`;

    expect(() => parsePropFirms(markdown)).toThrow(
      /duplicate program "Select 50k" in firm "Tradeify"/,
    );
  });

  it("allows the same program name in two different firms", () => {
    const markdown =
      block("Apex Trader Funding", FULL_BODY) + block("TradeDay", FULL_BODY);

    expect(parsePropFirms(markdown)).toHaveLength(2);
  });

  it("rejects a firm field inside a program", () => {
    const body = `${FULL_BODY}\nFirm website\nhttps://example.com`;

    expect(() => parsePropFirms(block("Tradeify", body))).toThrow(
      /"Firm website" in program "Rapid 50k" of firm "Tradeify" belongs above the firm's first "### " program heading/,
    );
  });

  it("rejects a rule field above the firm's first program", () => {
    expect(() =>
      parsePropFirms(block("Tradeify", FULL_BODY, "Account size\n$50,000")),
    ).toThrow(
      /"Account size" in firm "Tradeify" stands above its first "### " program heading/,
    );
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

  it("parses all fifteen firms", () => {
    const firms = parsePropFirms(markdown);

    expect(firms).toHaveLength(15);
    expect(firms.map((firm) => firm.name)).toContain("The Trading Pit");
  });

  it("fills every one of the eighteen rule fields for every program", () => {
    for (const firm of parsePropFirms(markdown)) {
      for (const program of firm.programs) {
        const missing = Object.entries(program.fields)
          .filter(([, value]) => value === null)
          .map(([key]) => key);

        expect(missing, `${firm.name} · ${program.name}`).toEqual([]);
      }
    }
  });

  // Curation rules, stricter than the parser: the program select lists a
  // firm's programs in file order, so the file must read smallest to largest;
  // and a firm is only verified once its website is known.
  it("lists each firm's programs from the smallest account size up", () => {
    for (const firm of parsePropFirms(markdown)) {
      const sizes = firm.programs.map((program) =>
        Number(program.accountSizeUsd),
      );

      expect(sizes, firm.name).toEqual([...sizes].sort((a, b) => a - b));
    }
  });

  it("names a website for every firm with a verification date", () => {
    for (const firm of parsePropFirms(markdown)) {
      if (firm.lastVerifiedAt !== null) {
        expect(firm.website, firm.name).not.toBeNull();
      }
    }
  });

  it("lists every program of the sized firms by name, keeping their 50k names", () => {
    const byName = new Map(
      parsePropFirms(markdown).map((firm) => [
        firm.name,
        firm.programs.map((program) => program.name),
      ]),
    );

    expect(byName.get("Futures Elite")).toEqual([
      "Elite Challenge 25k",
      "Elite Challenge 50k",
      "Elite Challenge 100k",
      "Elite Challenge 150k",
    ]);
    expect(byName.get("Tradeify")).toEqual([
      "Select 25k (Daily Payout)",
      "Select 50k (Daily Payout)",
      "Select 100k (Daily Payout)",
      "Select 150k (Daily Payout)",
      "Select 300k (Daily Payout)",
    ]);
    expect(byName.get("Take Profit Trader")).toEqual([
      "25k Test → PRO → PRO+",
      "50k Test → PRO → PRO+",
      "75k Test → PRO → PRO+",
      "100k Test → PRO → PRO+",
      "150k Test → PRO → PRO+",
    ]);
    expect(byName.get("My Funded Futures")).toEqual([
      "Rapid 25k",
      "Rapid 50k",
      "Rapid 100k",
      "Rapid 150k",
    ]);
    expect(byName.get("FundedNext")).toEqual([
      "Futures Rapid 25k",
      "Futures Rapid 50k",
      "Futures Rapid 100k",
    ]);
    expect(byName.get("Top One Futures")).toEqual([
      "Elite Daily 25k",
      "Elite Daily 50k",
      "Elite Daily 100k",
      "Elite Daily 150k",
    ]);
    expect(byName.get("BluSky")).toEqual([
      "Propel 25k",
      "Propel 50k",
      "Propel 100k",
      "Propel 150k",
      "Propel 200k",
      "Propel 300k",
    ]);
    expect(byName.get("Funded Futures Family")).toEqual([
      "Prime 25k",
      "Prime 50k",
      "Prime 100k",
      "Prime 150k",
    ]);
    expect(byName.get("Lucid Trading")).toEqual([
      "LucidFlex 25k",
      "LucidFlex 50k",
      "LucidFlex 100k",
      "LucidFlex 150k",
    ]);
    expect(byName.get("Apex Trader Funding")).toEqual([
      "25k EOD",
      "50k EOD",
      "100k EOD",
      "150k EOD",
    ]);
  });

  it("yields the summary tags the filter chips are built from", () => {
    const firms = parsePropFirms(markdown);
    const byName = new Map(firms.map((firm) => [firm.name, firm]));

    expect(byName.get("E8 Markets")?.programs[0].summaryTags).toEqual([
      "Static",
      "80% split",
    ]);
    expect(byName.get("Tradeify")?.programs[0].summaryTags).toEqual([
      "EOD",
      "90% split",
      "No funded consistency",
    ]);
  });

  // A curation rule, stricter than the parser: every program a firm sells has
  // a size, so a missing one in the file means the research missed it.
  it("reads an account size for every program", () => {
    for (const firm of parsePropFirms(markdown)) {
      for (const program of firm.programs) {
        expect(
          program.accountSizeUsd,
          `${firm.name} · ${program.name}`,
        ).not.toBeNull();
      }
    }
  });
});

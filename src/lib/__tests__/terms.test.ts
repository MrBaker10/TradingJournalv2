import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TERM_EXPLANATIONS } from "../terms.ts";

// GLOSSARY.md stays the source of truth and is never read at runtime; this
// check is what keeps the in-app explanations tied to it.
const glossary = readFileSync(join(process.cwd(), "GLOSSARY.md"), "utf8");
const entries = new Set(
  [...glossary.matchAll(/^\*\*(.+?)\*\*:\s*$/gm)].map((match) => match[1]),
);

describe("TERM_EXPLANATIONS", () => {
  it("explains the eleven terms the spec names", () => {
    expect(Object.values(TERM_EXPLANATIONS).map((term) => term.name)).toEqual([
      "Missed setup",
      "By the book",
      "Practice account",
      "Copy trade",
      "Streak",
      "Grace day",
      "Consistency score",
      "Chart clock",
      "R multiple",
      "MFE / MAE",
      "Ledger net",
    ]);
  });

  it.each(Object.values(TERM_EXPLANATIONS))(
    "finds every glossary entry behind $name",
    ({ glossaryEntries }) => {
      for (const entry of glossaryEntries) expect(entries).toContain(entry);
    },
  );

  it.each(Object.values(TERM_EXPLANATIONS))(
    "gives $name an explanation",
    ({ text }) => {
      expect(text.length).toBeGreaterThan(20);
    },
  );
});

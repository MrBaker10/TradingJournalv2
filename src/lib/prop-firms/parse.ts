import { isValid, parseISO } from "date-fns";

// `context/PropFirmsData.md` is the source of record for prop firm rules
// (project-overview.md, H). This module turns it into rows and does nothing
// else: it never normalises a value, never derives a number from the text and
// never fills a gap. Every rule field stays the verbatim string from the file,
// including the ones where a firm's own pages contradict each other.
//
// A line it cannot place is an error, not a skipped field. That is deliberate:
// the file is edited by hand, and a silent drop would show up as a missing rule
// on the page months later.

const PROGRAM_LABELS = {
  "Account size": "accountSize",
  "Profit target": "profitTarget",
  "Max drawdown": "maxDrawdown",
  "Daily loss limit": "dailyLossLimit",
  "Min trading days": "minTradingDays",
  "Consistency rule": "consistencyRule",
  "Consistency when funded": "consistencyWhenFunded",
  "News trading": "newsTrading",
  Overnight: "overnight",
  "Copy trading": "copyTrading",
  "First payout": "firstPayout",
  "Payout cycle": "payoutCycle",
  "Max payout / cycle": "maxPayoutCycle",
  "Profit split": "profitSplit",
  "Live program": "liveProgram",
  Scaling: "scaling",
  "End-of-day rule": "endOfDayRule",
  Notes: "notes",
} as const;

// These two describe the firm, not the program, so the parser lifts them out of
// the block. Neither is filled in the file yet — see the Open questions block in
// context/current-feature.md.
const FIRM_LABELS = {
  "Firm website": "website",
  "Last verified": "lastVerifiedAt",
} as const;

export type ProgramFieldKey =
  (typeof PROGRAM_LABELS)[keyof typeof PROGRAM_LABELS];

// Declaration order is file order, and file order is what the detail view and
// the compare table render.
export const PROGRAM_FIELD_LABELS: ReadonlyArray<
  readonly [ProgramFieldKey, string]
> = Object.entries(PROGRAM_LABELS).map(([label, key]) => [key, label] as const);

export type ProgramFields = Record<ProgramFieldKey, string | null>;

export interface ParsedProgram {
  name: string;
  summaryTags: string[];
  fields: ProgramFields;
}

export interface ParsedFirm {
  name: string;
  website: string | null;
  lastVerifiedAt: string | null;
  programs: ParsedProgram[];
}

interface Entry {
  text: string;
  line: number;
  /**
   * 1-based index of the blank-line-separated run this entry belongs to, counted
   * from the start of its firm block. Blank lines carry structure in this file —
   * see the paragraph check in `parseBlock`.
   */
  paragraph: number;
}

interface Block {
  name: string;
  line: number;
  entries: Entry[];
}

function programKey(text: string): ProgramFieldKey | undefined {
  return Object.hasOwn(PROGRAM_LABELS, text)
    ? PROGRAM_LABELS[text as keyof typeof PROGRAM_LABELS]
    : undefined;
}

function firmKey(
  text: string,
): (typeof FIRM_LABELS)[keyof typeof FIRM_LABELS] | undefined {
  return Object.hasOwn(FIRM_LABELS, text)
    ? FIRM_LABELS[text as keyof typeof FIRM_LABELS]
    : undefined;
}

function isLabel(text: string): boolean {
  return programKey(text) !== undefined || firmKey(text) !== undefined;
}

function emptyFields(): ProgramFields {
  const fields = {} as ProgramFields;
  for (const [key] of PROGRAM_FIELD_LABELS) {
    fields[key] = null;
  }
  return fields;
}

function fail(line: number, message: string): never {
  throw new Error(`PropFirmsData.md line ${line}: ${message}`);
}

// coding-standards.md forbids http, javascript: and data: URLs anywhere the app
// renders an anchor. The file is hand-curated, but the rule does not get an
// exception for trusted input.
function readWebsite(entry: Entry, firm: string): string {
  let url: URL;
  try {
    url = new URL(entry.text);
  } catch {
    return fail(
      entry.line,
      `"Firm website" for "${firm}" is not a URL: "${entry.text}"`,
    );
  }
  if (url.protocol !== "https:") {
    return fail(
      entry.line,
      `"Firm website" for "${firm}" must be https, found "${url.protocol}"`,
    );
  }
  return entry.text;
}

function readLastVerified(entry: Entry, firm: string): string {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(entry.text) ||
    !isValid(parseISO(entry.text))
  ) {
    return fail(
      entry.line,
      `"Last verified" for "${firm}" must be a YYYY-MM-DD date, found "${entry.text}"`,
    );
  }
  return entry.text;
}

function splitIntoBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = markdown.split(/\r?\n/);
  let paragraph = 0;
  let afterBlank = true;

  for (const [index, raw] of lines.entries()) {
    const line = index + 1;
    const text = raw.trim();
    if (text === "") {
      afterBlank = true;
      continue;
    }

    const heading = /^##\s+(.+)$/.exec(text);
    if (heading) {
      blocks.push({ name: heading[1].trim(), line, entries: [] });
      paragraph = 0;
      afterBlank = true;
      continue;
    }

    const current = blocks.at(-1);
    if (!current) {
      fail(line, `content before the first "## " heading: "${text}"`);
    }
    if (afterBlank) {
      paragraph += 1;
      afterBlank = false;
    }
    current.entries.push({ text, line, paragraph });
  }

  return blocks;
}

function parseBlock(block: Block): ParsedFirm {
  const { name, entries } = block;
  const first = entries[0];
  if (!first) {
    fail(block.line, `firm "${name}" has no program block`);
  }
  if (isLabel(first.text)) {
    fail(
      first.line,
      `expected a program name for "${name}", found the field label "${first.text}"`,
    );
  }

  let index = 1;

  // The summary lines above the rule table are the firm's own short form of the
  // program ("EOD", "90% split", "No DLL"). They are the only structured facet
  // this slice has, and they are taken verbatim — nothing is derived from the
  // eighteen rule fields.
  const summaryTags: string[] = [];
  while (index < entries.length && !isLabel(entries[index].text)) {
    summaryTags.push(entries[index].text);
    index += 1;
  }

  // Blank lines are structure here, and this is where that matters. Every firm
  // block reads: program name / summary tags / "target" / the rule table, each
  // its own paragraph, and the table always opens on a paragraph's first line.
  // So a label that shares its paragraph with the line above it means that line
  // lost its own label and was just swallowed as a summary tag. Without this
  // check that loss is silent, which is the one hole in the promise that an
  // unplaceable line is an error.
  const firstLabel = entries[index];
  if (firstLabel && firstLabel.paragraph === entries[index - 1].paragraph) {
    fail(
      firstLabel.line,
      `"${firstLabel.text}" opens the rule table of "${name}" but shares its paragraph with "${entries[index - 1].text}" — the line above it has lost its label`,
    );
  }

  // The export that produced this file broke "$3,000 target" across two lines.
  // Put it back together rather than carrying a bare "target" tag.
  if (summaryTags.length > 1 && summaryTags.at(-1) === "target") {
    summaryTags.pop();
    summaryTags[summaryTags.length - 1] =
      `${summaryTags[summaryTags.length - 1]} target`;
  }

  const fields = emptyFields();
  let website: string | null = null;
  let lastVerifiedAt: string | null = null;
  const seen = new Set<string>();

  while (index < entries.length) {
    const label = entries[index];
    const forProgram = programKey(label.text);
    const forFirm = firmKey(label.text);

    if (!forProgram && !forFirm) {
      fail(
        label.line,
        `"${label.text}" in firm "${name}" is neither a known field label nor a value under one`,
      );
    }
    if (seen.has(label.text)) {
      fail(label.line, `duplicate label "${label.text}" in firm "${name}"`);
    }
    seen.add(label.text);

    // A label immediately followed by another label (or by the end of the
    // block) has no value. That is how "Firm website" sits in the file today,
    // and it means unknown — not empty string.
    const next = entries[index + 1];
    const value = next && !isLabel(next.text) ? next : undefined;
    index += value ? 2 : 1;

    if (forProgram) {
      fields[forProgram] = value ? value.text : null;
    } else if (forFirm === "website") {
      website = value ? readWebsite(value, name) : null;
    } else {
      lastVerifiedAt = value ? readLastVerified(value, name) : null;
    }
  }

  return {
    name,
    website,
    lastVerifiedAt,
    programs: [{ name: first.text, summaryTags, fields }],
  };
}

export function parsePropFirms(markdown: string): ParsedFirm[] {
  const firms = splitIntoBlocks(markdown).map(parseBlock);

  const seen = new Set<string>();
  for (const firm of firms) {
    if (seen.has(firm.name)) {
      throw new Error(
        `PropFirmsData.md: duplicate firm heading "${firm.name}"`,
      );
    }
    seen.add(firm.name);
  }

  return firms;
}

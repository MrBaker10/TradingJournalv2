import { isValid, parseISO } from "date-fns";

// `context/PropFirmsData.md` is the source of record for prop firm rules
// (project-overview.md, H). This module turns it into rows and does nothing
// else: it never normalises a value, never fills a gap, and derives exactly one
// number, the account size (context/decisions.md). Every rule field stays the
// verbatim string from the file, including the ones where a firm's own pages
// contradict each other.
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

// These two describe the firm, not the program, so they stand between the firm
// heading and its first program heading. Either may be missing, which means
// unknown.
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
  /** 1-based place within its firm, in file order — the order lists show. */
  position: number;
  /** Whole USD read from `Account size`, as a numeric string; null if unknown. */
  accountSizeUsd: string | null;
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
   * from the start of its block. Blank lines carry structure in this file —
   * see the paragraph check in `readSummaryTags`.
   */
  paragraph: number;
}

interface Block {
  name: string;
  line: number;
  entries: Entry[];
}

// A `## ` firm heading owns the firm fields up to its first `### ` program
// heading, then one block per program.
interface FirmBlock extends Block {
  programs: Block[];
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

// "50k", "100K", "150 k": a number followed by k.
const SIZE_TOKEN = /\b\d+\s?k\b/i;

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

// The one field read as a number, so the page can filter by size
// (context/decisions.md). Only the plain form parses; anything with a
// qualifier stops the seed rather than being read loosely.
function readAccountSize(entry: Entry, location: string): string {
  if (!/^\$[1-9]\d{0,2}(,\d{3})*$/.test(entry.text)) {
    return fail(
      entry.line,
      `"Account size" of ${location} must be a dollar amount like "$50,000", found "${entry.text}"`,
    );
  }
  return entry.text.replace(/[$,]/g, "");
}

function splitIntoBlocks(markdown: string): FirmBlock[] {
  const firms: FirmBlock[] = [];
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

    const programHeading = /^###\s+(.+)$/.exec(text);
    if (programHeading) {
      const firm = firms.at(-1);
      if (!firm) {
        fail(
          line,
          `program heading before the first "## " firm heading: "${text}"`,
        );
      }
      firm.programs.push({ name: programHeading[1].trim(), line, entries: [] });
      paragraph = 0;
      afterBlank = true;
      continue;
    }

    const firmHeading = /^##\s+(.+)$/.exec(text);
    if (firmHeading) {
      firms.push({
        name: firmHeading[1].trim(),
        line,
        entries: [],
        programs: [],
      });
      paragraph = 0;
      afterBlank = true;
      continue;
    }

    const firm = firms.at(-1);
    if (!firm) {
      fail(line, `content before the first "## " heading: "${text}"`);
    }
    if (afterBlank) {
      paragraph += 1;
      afterBlank = false;
    }
    (firm.programs.at(-1) ?? firm).entries.push({ text, line, paragraph });
  }

  return firms;
}

interface LabelPair<K> {
  key: K;
  value: Entry | undefined;
}

// Reads a run of label/value pairs, each label one that `keyFor` knows. A
// label of the other kind is a real label in the wrong block and fails with
// `misplaced`; anything else fails as unplaceable.
function readLabelPairs<K>(
  entries: Entry[],
  location: string,
  keyFor: (text: string) => K | undefined,
  misplaced: string,
): LabelPair<K>[] {
  const pairs: LabelPair<K>[] = [];
  const seen = new Set<string>();
  let index = 0;

  while (index < entries.length) {
    const label = entries[index];
    const key = keyFor(label.text);

    if (key === undefined) {
      fail(
        label.line,
        isLabel(label.text)
          ? `"${label.text}" in ${location} ${misplaced}`
          : `"${label.text}" in ${location} is neither a known field label nor a value under one`,
      );
    }
    if (seen.has(label.text)) {
      fail(label.line, `duplicate label "${label.text}" in ${location}`);
    }
    seen.add(label.text);

    // A label immediately followed by another label (or by the end of the
    // block) has no value. That means unknown — not empty string.
    const next = entries[index + 1];
    const value = next && !isLabel(next.text) ? next : undefined;
    index += value ? 2 : 1;

    pairs.push({ key, value });
  }

  return pairs;
}

// The lines between a firm heading and its first program: firm fields only.
function parseFirmFields(
  block: FirmBlock,
): Pick<ParsedFirm, "website" | "lastVerifiedAt"> {
  const { name } = block;
  let website: string | null = null;
  let lastVerifiedAt: string | null = null;

  for (const { key, value } of readLabelPairs(
    block.entries,
    `firm "${name}"`,
    firmKey,
    `stands above its first "### " program heading`,
  )) {
    if (key === "website") {
      website = value ? readWebsite(value, name) : null;
    } else {
      lastVerifiedAt = value ? readLastVerified(value, name) : null;
    }
  }

  return { website, lastVerifiedAt };
}

function parseFirm(block: FirmBlock): ParsedFirm {
  const { name } = block;
  if (block.programs.length === 0) {
    fail(block.line, `firm "${name}" has no "### " program heading`);
  }

  const seen = new Set<string>();
  const programs = block.programs.map((program, index) => {
    if (seen.has(program.name)) {
      fail(
        program.line,
        `duplicate program "${program.name}" in firm "${name}"`,
      );
    }
    seen.add(program.name);
    return parseProgram(program, name, index + 1);
  });

  return { name, ...parseFirmFields(block), programs };
}

// The summary lines above the rule table are the firm's own short form of the
// program ("EOD", "90% split", "No DLL"). They are the only structured facet
// the page has, and they are taken verbatim — nothing is derived from the
// eighteen rule fields. Returns the tags and where the rule table starts.
function readSummaryTags(
  entries: Entry[],
  location: string,
): { summaryTags: string[]; tableStart: number } {
  let index = 0;
  while (index < entries.length && !isLabel(entries[index].text)) {
    index += 1;
  }
  const summaryTags = entries.slice(0, index).map((entry) => entry.text);

  // Blank lines are structure here, and this is where that matters. Every
  // program block reads: summary tags / the rule table, each its own paragraph,
  // and the table always opens on a paragraph's first line. So a label that
  // shares its paragraph with the line above it means that line lost its own
  // label and was just swallowed as a summary tag. Without this check that loss
  // is silent, which is the one hole in the promise that an unplaceable line is
  // an error.
  const firstLabel = entries[index];
  if (
    firstLabel &&
    index > 0 &&
    firstLabel.paragraph === entries[index - 1].paragraph
  ) {
    fail(
      firstLabel.line,
      `"${firstLabel.text}" opens the rule table of ${location} but shares its paragraph with "${entries[index - 1].text}" — the line above it has lost its label`,
    );
  }

  // Tags become filter chips shared by every size of every firm, so a tag that
  // names an amount or a size ("$3,000 target", "50k EOD") would only ever
  // match one size. Those facts live in the rule fields instead.
  for (const [offset, tag] of summaryTags.entries()) {
    if (tag.includes("$") || SIZE_TOKEN.test(tag)) {
      fail(
        entries[offset].line,
        `summary tag "${tag}" of ${location} names an amount or a size; tags must hold for every size`,
      );
    }
  }

  return { summaryTags, tableStart: index };
}

function parseProgram(
  block: Block,
  firm: string,
  position: number,
): ParsedProgram {
  const { name, entries } = block;
  const location = `program "${name}" of firm "${firm}"`;
  const { summaryTags, tableStart } = readSummaryTags(entries, location);

  // A heading whose table went missing would otherwise seed a program with
  // every field unknown, and nobody would notice.
  if (tableStart === entries.length) {
    fail(block.line, `${location} has no rule table`);
  }

  const fields = emptyFields();
  let accountSizeUsd: string | null = null;

  for (const { key, value } of readLabelPairs(
    entries.slice(tableStart),
    location,
    programKey,
    `belongs above the firm's first "### " program heading`,
  )) {
    fields[key] = value ? value.text : null;
    if (key === "accountSize" && value) {
      accountSizeUsd = readAccountSize(value, location);
    }
  }

  return { name, position, accountSizeUsd, summaryTags, fields };
}

export function parsePropFirms(markdown: string): ParsedFirm[] {
  const firms = splitIntoBlocks(markdown).map(parseFirm);

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

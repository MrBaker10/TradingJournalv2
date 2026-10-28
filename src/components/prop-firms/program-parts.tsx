import { ExternalLink, Link2 } from "lucide-react";
import type { PropFirmRow } from "@/db/queries/prop-firms";
import type { ProgramFieldKey } from "@/lib/prop-firms/parse";

// What the card, the firm sheet and the compare panel share (Design.md §3.9).
// Every rule is shown as the file writes it; nothing here reads a rule.

type Program = PropFirmRow["program"];
type Firm = PropFirmRow["firm"];

/** The six figures a trader scans first, in this order. */
const KEY_FIELDS: { key: ProgramFieldKey; label: string }[] = [
  { key: "accountSize", label: "Size" },
  { key: "profitTarget", label: "Target" },
  { key: "maxDrawdown", label: "Max drawdown" },
  { key: "dailyLossLimit", label: "Daily loss" },
  { key: "minTradingDays", label: "Min days" },
  { key: "profitSplit", label: "Split" },
];

// Numbers are mono with tabular figures (Design.md §2, Type). Decided per
// field, never per value: sniffing whether a value looks numeric would be the
// app reading the rule. The price is that "None" in these fields is mono too.
export const NUMERIC_FIELDS: ReadonlySet<ProgramFieldKey> = new Set([
  "accountSize",
  "profitTarget",
  "maxDrawdown",
  "dailyLossLimit",
  "minTradingDays",
  "maxPayoutCycle",
  "profitSplit",
]);

// A missing rule is stated, not hidden: the gap is the point
// (project-overview.md — the app never invents a rule). It is not a number,
// so it keeps the sans face in a mono field.
export function RuleValue({ value }: { value: string | null }) {
  if (value === null) {
    return (
      <span className="font-sans text-muted-foreground italic">
        Not recorded
      </span>
    );
  }
  return value;
}

/**
 * The six key figures, truncated with the full text on hover. Spans only, so
 * the grid may sit inside the card's button.
 */
export function KeyFigures({ program, id }: { program: Program; id?: string }) {
  return (
    <span id={id} className="grid grid-cols-3 gap-x-4 gap-y-2">
      {KEY_FIELDS.map((field) => (
        <span key={field.key} className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[11px] text-muted-foreground">
            {field.label}
          </span>
          <span
            className="truncate font-mono text-[13px] tabular-nums"
            title={program[field.key] ?? undefined}
          >
            <RuleValue value={program[field.key]} />
          </span>
        </span>
      ))}
    </span>
  );
}

export function Tags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-sm bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
        >
          {tag}
        </span>
      ))}
    </span>
  );
}

/** The real accounts on this program, named, never by colour alone. */
export function LinkedBadge({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  return (
    <span
      title={`Linked to ${names.join(", ")}`}
      className="inline-flex max-w-full items-center gap-1 self-start rounded-full border px-2 py-0.5 text-[11px] text-foreground"
    >
      <Link2 className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="sr-only">Linked to </span>
      <span className="truncate">{names.join(", ")}</span>
    </span>
  );
}

export function FirmMeta({ firm }: { firm: Firm }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
      {/* The seeder only accepts https websites (parse.ts). */}
      {firm.website ? (
        <a
          href={firm.website}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 underline-offset-4 hover:text-foreground hover:underline"
        >
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
          Website
        </a>
      ) : (
        <span className="italic">Website not recorded</span>
      )}
      {firm.lastVerifiedAt ? (
        <span>
          Verified{" "}
          <span className="font-mono text-foreground tabular-nums">
            {firm.lastVerifiedAt}
          </span>
        </span>
      ) : (
        <span className="italic">Never verified</span>
      )}
    </div>
  );
}

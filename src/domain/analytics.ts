// The eleven analytics dimensions, and the arithmetic that turns an
// aggregated row into a row the screen can print.
//
// Contract:
//
// - **Nothing is aggregated here.** Every sum and count arrives finished from
//   `src/db/queries/analytics.ts`, which has already applied the account
//   multiplier, the practice filter and the date range. This module divides
//   two numbers that are already there, and sorts.
// - Money arrives as **integer cents** and leaves as integer cents. The only
//   floats produced are ratios: `winRate`, `avgR` and `barRatio`.
// - A bucket the trade had no value for arrives as `null` and becomes one
//   explicit "Not set" row at the end, never a dropped row. Shares have to add
//   up, and a dimension nobody fills in is itself the finding.

/** The eleven dimensions of project-overview.md §F, in the order it lists them. */
export type DimensionId =
  | "account"
  | "setupType"
  | "entryModel"
  | "session"
  | "instrument"
  | "weekday"
  | "hour"
  | "confluence"
  | "felt"
  | "grade"
  | "mistake";

export const DIMENSION_IDS: DimensionId[] = [
  "account",
  "setupType",
  "entryModel",
  "session",
  "instrument",
  "weekday",
  "hour",
  "confluence",
  "felt",
  "grade",
  "mistake",
];

export const DIMENSION_TITLES: Record<DimensionId, string> = {
  account: "By account",
  setupType: "By setup type",
  entryModel: "By entry model",
  session: "By session",
  instrument: "By instrument",
  weekday: "By weekday",
  hour: "By hour",
  confluence: "By confluence",
  felt: "By emotional state",
  grade: "By execution grade",
  mistake: "By mistake",
};

/**
 * Dimensions that come from a join table, where one trade contributes a row
 * per tag. Their "Trades" column deliberately does not sum to the total, and
 * the card says so — see `DIMENSION_NOTES`.
 */
export const DIMENSION_NOTES: Partial<Record<DimensionId, string>> = {
  account: "A copy-traded execution counts once per account it ran on.",
  confluence: "A trade with several confluences appears in several rows.",
  mistake: "A trade with several mistakes appears in several rows.",
};

/** The label for a bucket the trade left empty. */
export const NOT_SET_LABEL = "Not set";

/** How many rows a dimension card shows before the "Show all" disclosure. */
export const DIMENSION_ROW_LIMIT = 8;

/** One `GROUP BY` row, exactly as the query hands it back. */
export interface DimensionAggregateRow {
  dimension: DimensionId;
  /** null when the trade carried no value for this dimension. */
  bucket: string | null;
  /** Count aggregate: one execution counts once. */
  trades: number;
  /** Count aggregate: trades whose derived P&L is positive. */
  wins: number;
  /** Money aggregate, integer cents: already multiplied by real accounts. */
  netPnlCents: number;
  /** Sum of the R multiples that have one. null when none did. */
  rSum: number | null;
  /** How many trades contributed to `rSum` — trades without a stop have none. */
  rCount: number;
}

export interface DimensionRow {
  label: string;
  isNotSet: boolean;
  trades: number;
  /** 0–1. null when the bucket has no trades to divide by. */
  winRate: number | null;
  netPnlCents: number;
  /** null when no trade in the bucket had a stop price to measure R against. */
  avgR: number | null;
  /** 0–1 against the largest absolute net P&L of this dimension. */
  barRatio: number;
}

/** Postgres `extract(dow …)`: 0 is Sunday, 6 is Saturday. */
const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * A raw bucket value as it should read on screen.
 *
 * Weekday and hour arrive as numbers cast to text, because the eleven
 * groupings are unioned into one statement and a union needs one column type.
 * Turning them back into words is deterministic, so it is tested here rather
 * than improvised in a component.
 *
 * A number that does not parse is printed as it arrived. Inventing a label for
 * it would hide a query bug behind a plausible word.
 */
export function formatBucketLabel(
  dimension: DimensionId,
  bucket: string | null,
): string {
  if (bucket === null) return NOT_SET_LABEL;

  if (dimension === "weekday") {
    const index = Number(bucket);
    return WEEKDAY_LABELS[index] ?? bucket;
  }

  if (dimension === "hour") {
    const hour = Number(bucket);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) return bucket;
    return `${String(hour).padStart(2, "0")}:00`;
  }

  return bucket;
}

/**
 * The rows of one dimension, ready to print.
 *
 * Sorted by net P&L descending, because the question the page answers is
 * "what pays". Ties fall back to the trade count and then to the label, so the
 * order is stable across requests rather than left to the database.
 *
 * "Not set" always sorts last regardless of its P&L: it is the absence of a
 * value, not a value that beat the others.
 *
 * The bar is scaled against the largest **absolute** net P&L of the dimension,
 * so the worst bucket and the best one are drawn at comparable weight. A
 * dimension whose buckets all net exactly zero gets no bars at all rather than
 * a division by zero.
 */
export function buildDimensionRows(
  dimension: DimensionId,
  rows: DimensionAggregateRow[],
): DimensionRow[] {
  let largestAbs = 0;
  for (const row of rows) {
    const magnitude = Math.abs(row.netPnlCents);
    if (magnitude > largestAbs) largestAbs = magnitude;
  }

  return rows
    .map((row) => ({
      label: formatBucketLabel(dimension, row.bucket),
      isNotSet: row.bucket === null,
      trades: row.trades,
      winRate: row.trades > 0 ? row.wins / row.trades : null,
      netPnlCents: row.netPnlCents,
      avgR: row.rCount > 0 && row.rSum !== null ? row.rSum / row.rCount : null,
      barRatio: largestAbs > 0 ? Math.abs(row.netPnlCents) / largestAbs : 0,
    }))
    .sort(compareDimensionRows);
}

function compareDimensionRows(a: DimensionRow, b: DimensionRow): number {
  if (a.isNotSet !== b.isNotSet) return a.isNotSet ? 1 : -1;
  if (a.netPnlCents !== b.netPnlCents) return b.netPnlCents - a.netPnlCents;
  if (a.trades !== b.trades) return b.trades - a.trades;
  return a.label.localeCompare(b.label);
}

/** Splits `getDimensionBreakdowns`' single result set into its dimensions. */
export function groupByDimension(
  rows: DimensionAggregateRow[],
): Record<DimensionId, DimensionRow[]> {
  const byDimension = {} as Record<DimensionId, DimensionRow[]>;
  for (const dimension of DIMENSION_IDS) {
    byDimension[dimension] = buildDimensionRows(
      dimension,
      rows.filter((row) => row.dimension === dimension),
    );
  }
  return byDimension;
}

// --- Missed setups -------------------------------------------------------
// A separate section because it touches no money. A missed setup has no exit,
// no P&L and no account, so the only honest figures are how many there were
// and how large a share of that bucket's entries they are.

/** The four dimensions a hesitation pattern shows up in. */
export type MissedDimensionId =
  | "setupType"
  | "session"
  | "instrument"
  | "weekday";

export const MISSED_DIMENSION_IDS: MissedDimensionId[] = [
  "setupType",
  "session",
  "instrument",
  "weekday",
];

export const MISSED_DIMENSION_TITLES: Record<MissedDimensionId, string> = {
  setupType: "By setup type",
  session: "By session",
  instrument: "By instrument",
  weekday: "By weekday",
};

export interface MissedAggregateRow {
  dimension: MissedDimensionId;
  bucket: string | null;
  /** Entries with `taken = false` in this bucket. */
  missed: number;
  /** All entries in this bucket, taken and missed alike. */
  entries: number;
}

export interface MissedRow {
  label: string;
  isNotSet: boolean;
  missed: number;
  entries: number;
  /** Missed over entries, 0–1. null when the bucket holds no entries at all. */
  share: number | null;
  /** 0–1 against the largest missed count of this dimension. */
  barRatio: number;
}

/**
 * The missed-setup rows of one dimension, sorted by count descending.
 *
 * Buckets with nothing missed are dropped: this section answers "where do I
 * hesitate", and a row reading zero is the answer to a question nobody asked.
 * The dimension tables above keep every bucket, because there a zero row still
 * carries a P&L.
 */
export function buildMissedRows(
  dimension: MissedDimensionId,
  rows: MissedAggregateRow[],
): MissedRow[] {
  const withMisses = rows.filter((row) => row.missed > 0);

  let largest = 0;
  for (const row of withMisses) {
    if (row.missed > largest) largest = row.missed;
  }

  return withMisses
    .map((row) => ({
      label: formatBucketLabel(dimension, row.bucket),
      isNotSet: row.bucket === null,
      missed: row.missed,
      entries: row.entries,
      share: row.entries > 0 ? row.missed / row.entries : null,
      barRatio: largest > 0 ? row.missed / largest : 0,
    }))
    .sort(compareMissedRows);
}

function compareMissedRows(a: MissedRow, b: MissedRow): number {
  if (a.isNotSet !== b.isNotSet) return a.isNotSet ? 1 : -1;
  if (a.missed !== b.missed) return b.missed - a.missed;
  return a.label.localeCompare(b.label);
}

export function groupMissedByDimension(
  rows: MissedAggregateRow[],
): Record<MissedDimensionId, MissedRow[]> {
  const byDimension = {} as Record<MissedDimensionId, MissedRow[]>;
  for (const dimension of MISSED_DIMENSION_IDS) {
    byDimension[dimension] = buildMissedRows(
      dimension,
      rows.filter((row) => row.dimension === dimension),
    );
  }
  return byDimension;
}

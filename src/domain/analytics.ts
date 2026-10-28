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

export type QuestionId =
  | "results"
  | "when"
  | "what"
  | "execution"
  | "way"
  | "hesitate";

export interface AnalyticsQuestion {
  id: QuestionId;
  title: string;
  /** One line under the title: what the answer is made of. */
  hint: string;
  /** The dimensions answered inside this question. */
  dimensions: readonly DimensionId[];
}

/** Trades with an R a bucket needs before its avg R is ranked. */
export const MIN_RANKED_R_TRADES = 3;

/**
 * The six questions Analytics is read by (Design.md §3.7), in page order.
 * Every one of the eleven dimensions belongs to exactly one. The first is
 * answered by the ranking across all of them, execution by the execution
 * figures and the last by the missed setups, so those hold no dimension;
 * weekday and hour are drawn as columns inside "When".
 */
export const ANALYTICS_QUESTIONS: readonly AnalyticsQuestion[] = [
  {
    id: "results",
    title: "What holds my results up, what drags them down?",
    hint: `Every dimension except account, by avg R, where at least ${MIN_RANKED_R_TRADES} trades had a stop to measure R against.`,
    dimensions: [],
  },
  {
    id: "when",
    title: "When do I trade well?",
    hint: "Net P&L per weekday and per hour of the chart clock; trades under each column.",
    dimensions: ["weekday", "hour", "session"],
  },
  {
    id: "what",
    title: "What am I trading, and how?",
    hint: "Net P&L with avg R beside it.",
    dimensions: [
      "setupType",
      "entryModel",
      "instrument",
      "confluence",
      "account",
    ],
  },
  {
    id: "execution",
    title: "How do I execute?",
    hint: "Winners against losers. Post-exit moves are hypothetical.",
    dimensions: [],
  },
  {
    id: "way",
    title: "What gets in my way?",
    hint: "Mistakes, how you felt, how you graded yourself.",
    dimensions: ["mistake", "felt", "grade"],
  },
  {
    id: "hesitate",
    title: "Where do I hesitate?",
    hint: "Missed setups: counts and share of all entries, never P&L.",
    dimensions: [],
  },
];

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
  /** How many trades carried an R: the weight behind `avgR`. */
  rCount: number;
  /**
   * 0–1 against the largest absolute net P&L of the set buckets of this
   * dimension. null for Not set, which shows its figures without a bar.
   */
  barRatio: number | null;
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
 * The bar is scaled against the largest **absolute** net P&L of the set
 * buckets, so the worst bucket and the best one are drawn at comparable
 * weight. Not set stays out of the scale and gets no bar: it often holds most
 * trades and would dwarf the real buckets. A dimension whose buckets all net
 * exactly zero gets no bars at all rather than a division by zero.
 */
export function buildDimensionRows(
  dimension: DimensionId,
  rows: DimensionAggregateRow[],
): DimensionRow[] {
  let largestAbs = 0;
  for (const row of rows) {
    if (row.bucket === null) continue;
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
      rCount: row.rCount,
      barRatio:
        row.bucket === null
          ? null
          : largestAbs > 0
            ? Math.abs(row.netPnlCents) / largestAbs
            : 0,
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

/** The dimensions that hold data, and the ones that do not, in dimension order. */
export interface RecordedDimensions {
  recorded: DimensionId[];
  notRecorded: DimensionId[];
}

/**
 * Which dimensions earn a card. A dimension is not recorded when it has no
 * rows or only the "Not set" bucket — the page names those in one line instead
 * of giving each a card of its own. One set bucket is enough to keep the card:
 * a little data is never hidden.
 */
export function splitRecordedDimensions(
  byDimension: Record<DimensionId, DimensionRow[]>,
): RecordedDimensions {
  const recorded: DimensionId[] = [];
  const notRecorded: DimensionId[] = [];
  for (const dimension of DIMENSION_IDS) {
    const holdsData = byDimension[dimension].some((row) => !row.isNotSet);
    (holdsData ? recorded : notRecorded).push(dimension);
  }
  return { recorded, notRecorded };
}

/**
 * Whether the page should say once why every Avg R is a dash: at least one
 * dimension is recorded, so there is a card showing the dashes, and no bucket
 * in any dimension — recorded or not — has an R, because no trade in the range
 * had a stop price to measure it against. A bucket in an unrecorded dimension
 * still counts: a trade with an R there means the sentence would be untrue.
 */
export function shouldExplainMissingAvgR(
  byDimension: Record<DimensionId, DimensionRow[]>,
): boolean {
  const { recorded } = splitRecordedDimensions(byDimension);
  const rows = DIMENSION_IDS.flatMap((dimension) => byDimension[dimension]);
  return recorded.length > 0 && rows.every((row) => row.avgR === null);
}

// --- Metric switch ---------------------------------------------------------
// Only the detail sheet switches the metric (Design.md §3.7); the overview
// reads net P&L with avg R beside it.

export type AnalyticsMetric = "pnl" | "winRate" | "avgR" | "trades";

export const ANALYTICS_METRICS: { id: AnalyticsMetric; label: string }[] = [
  { id: "pnl", label: "Net P&L" },
  { id: "winRate", label: "Win rate" },
  { id: "avgR", label: "Avg R" },
  { id: "trades", label: "Trades" },
];

/** A row's figure for the metric; null where the bucket has none. */
export function metricValue(
  row: DimensionRow,
  metric: AnalyticsMetric,
): number | null {
  switch (metric) {
    case "pnl":
      return row.netPnlCents;
    case "winRate":
      return row.winRate;
    case "avgR":
      return row.avgR;
    case "trades":
      return row.trades;
  }
}

/**
 * The rows by the switched metric, highest first; a bucket without a value
 * for it after the rest, and Not set last as everywhere else. Ties fall back
 * to the label so the order is stable.
 */
export function sortByMetric(
  rows: DimensionRow[],
  metric: AnalyticsMetric,
): DimensionRow[] {
  return [...rows].sort((a, b) => {
    if (a.isNotSet !== b.isNotSet) return a.isNotSet ? 1 : -1;
    const left = metricValue(a, metric);
    const right = metricValue(b, metric);
    if (left === null || right === null) {
      if (left !== right) return left === null ? 1 : -1;
    } else if (left !== right) {
      return right - left;
    }
    return a.label.localeCompare(b.label);
  });
}

/**
 * The order of a dimension's rows in the detail sheet: by the switched
 * metric, except for accounts. Ranking accounts against each other is not
 * built (spec, Do not build), so they keep the net P&L order of
 * `buildDimensionRows` whatever the switch shows.
 */
export function detailOrder(
  dimension: DimensionId,
  rows: DimensionRow[],
  metric: AnalyticsMetric,
): DimensionRow[] {
  return dimension === "account" ? rows : sortByMetric(rows, metric);
}

// --- Columns ---------------------------------------------------------------
// Weekday and hour are drawn as columns from a zero line (Design.md §3.7).

/** Monday first: the trading week, with Sunday's Globex open at its end. */
const WEEKDAY_COLUMN_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/**
 * The rows of weekday or hour in the order their columns stand: the days of
 * the week from Monday, the hours through the day. Not set has no place on
 * either axis and is left out. Hour labels are zero-padded ("09:00"), so they
 * sort as text.
 */
export function columnOrder(
  dimension: "weekday" | "hour",
  rows: DimensionRow[],
): DimensionRow[] {
  const position = (row: DimensionRow) =>
    dimension === "weekday" ? WEEKDAY_COLUMN_ORDER.indexOf(row.label) : 0;
  return rows
    .filter((row) => !row.isNotSet)
    .sort(
      (a, b) => position(a) - position(b) || a.label.localeCompare(b.label),
    );
}

export interface ZeroLineBar {
  /** Where the bar starts on the axis, in percent. */
  start: number;
  /** How long it is, in percent of the axis. */
  length: number;
}

export interface ZeroLineLayout {
  /** The zero line, in percent of the axis. */
  zero: number;
  /** One per value, in order; null where the value has no bar. */
  bars: (ZeroLineBar | null)[];
}

/** Two decimals, so server and browser print the same attributes. */
function roundPercent(value: number): number {
  return Math.round(value * 100) / 100 || 0;
}

/**
 * Bars from a zero line on one axis that runs from the largest loss (0) to
 * the largest gain (100). The zero line sits where the ratio of those two puts
 * it, so a page of only gains uses the whole axis instead of leaving half of
 * it empty, and gains and losses share one scale. A null value (Not set) has
 * no bar and does not move the scale. Used for the weekday and hour columns
 * and for the bars of the detail sheet; a metric without a sign simply never
 * has a loss, and its zero line sits at 0.
 */
export function zeroLineLayout(values: (number | null)[]): ZeroLineLayout {
  let largestGain = 0;
  let largestLoss = 0;
  for (const value of values) {
    if (value === null) continue;
    largestGain = Math.max(largestGain, value);
    largestLoss = Math.max(largestLoss, -value);
  }
  const span = largestGain + largestLoss;
  const zero = span === 0 ? 0 : (largestLoss / span) * 100;

  return {
    zero: roundPercent(zero),
    bars: values.map((value) => {
      if (value === null) return null;
      const length = span === 0 ? 0 : (Math.abs(value) / span) * 100;
      const start = value < 0 ? zero - length : zero;
      return { start: roundPercent(start), length: roundPercent(length) };
    }),
  };
}

// --- Ranking ---------------------------------------------------------------
// "What holds my results up, what drags them down?" (Design.md §3.7): every
// bucket of every dimension on one scale, avg R.

/** How many buckets each side of the ranking shows. */
export const RANKED_BUCKET_COUNT = 5;

export interface RankedBucket {
  dimension: DimensionId;
  row: DimensionRow;
}

export interface BucketRanking {
  /** Positive avg R, strongest first. */
  holdingUp: RankedBucket[];
  /** Negative avg R, weakest first. */
  dragging: RankedBucket[];
}

/**
 * The buckets ranked by avg R across every dimension except account, only
 * where at least three trades carried an R, so a bucket never looks strong on
 * one trade. Account is left out because ranking accounts against each other
 * is not built (spec, Do not build). Not set is the absence of a value, and an
 * avg R of exactly zero belongs on neither side. Ties keep the more trades
 * with an R first, then the label, so the order is stable.
 */
export function rankBuckets(
  byDimension: Record<DimensionId, DimensionRow[]>,
): BucketRanking {
  const candidates = DIMENSION_IDS.filter(
    (dimension) => dimension !== "account",
  ).flatMap((dimension) =>
    byDimension[dimension]
      .filter(
        (row) =>
          !row.isNotSet &&
          row.avgR !== null &&
          row.rCount >= MIN_RANKED_R_TRADES,
      )
      .map((row) => ({ dimension, row })),
  );
  // `direction` 1 puts the highest avg R first, -1 the lowest.
  const side = (direction: 1 | -1) =>
    candidates
      .filter((bucket) => Math.sign(bucket.row.avgR ?? 0) === direction)
      .sort(
        (a, b) =>
          direction * ((b.row.avgR ?? 0) - (a.row.avgR ?? 0)) ||
          b.row.rCount - a.row.rCount ||
          a.row.label.localeCompare(b.row.label),
      )
      .slice(0, RANKED_BUCKET_COUNT);

  return { holdingUp: side(1), dragging: side(-1) };
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

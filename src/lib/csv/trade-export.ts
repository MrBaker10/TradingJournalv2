import type { ExportTradeRow } from "../../db/queries/export.ts";
import { calculatePnl, type TradeDirection } from "../../domain/pnl.ts";
import { dollarsToCents, formatCentsPlain } from "../money.ts";

/**
 * The header row, and the order every data row follows. One list, so a column
 * can never drift away from the value written under it.
 */
export const EXPORT_COLUMNS = [
  "trade_date",
  "taken",
  "instrument",
  "direction",
  "contracts",
  "entry_time",
  "exit_time",
  "entry_price",
  "exit_price",
  "stop_price",
  "points",
  "session",
  "setup_type",
  "entry_model",
  "result",
  "grade",
  "felt",
  "by_the_book",
  "mfe_r",
  "mae_r",
  "post_exit_mfe_r",
  "pnl_override",
  "pnl",
  "r_multiple",
  "confluences",
  "mistakes",
  "notes",
  "links",
  "link_labels",
  "screenshot_count",
  "accounts",
  "is_practice",
  "created_at",
] as const;

/** Semicolon-separated list. Several columns are written in pairs (accounts /
 * is_practice, links / link_labels) and stay positionally aligned because both
 * halves come from the same array. */
const LIST_SEPARATOR = ";";

/** NULL leaves the field empty rather than writing the word "null". */
function text(value: string | null): string {
  return value ?? "";
}

function bool(value: boolean | null): string {
  return value === null ? "" : String(value);
}

function number(value: number | null): string {
  return value === null ? "" : String(value);
}

/**
 * Realised P&L and R, derived the same way the journal row derives them:
 * through `calculatePnl`, never through a second formula written for the
 * export. Cents in, `formatCentsPlain` out — no float ever touches the money.
 *
 * Both stay empty where there is nothing realised: a missed setup, or a trade
 * without an exit. R is additionally empty without a stop price, because there
 * is no risk to divide by.
 *
 * This is the per-trade value, not a figure — the same distinction
 * `tradePnlCents` in src/db/queries/trades.ts draws. A trade copy-traded onto
 * three accounts contributes three times to net P&L, but it is one row here
 * with one `pnl`. Summing this column is therefore not the journal's Net P&L;
 * the `accounts` column is what carries the multiplier.
 */
function derivePnl(row: ExportTradeRow): { pnl: string; rMultiple: string } {
  if (!row.taken || row.exitPrice === null || row.contracts === null) {
    return { pnl: "", rMultiple: "" };
  }

  const result = calculatePnl(
    {
      direction: row.direction as TradeDirection,
      entryPrice: Number(row.entryPrice),
      exitPrice: Number(row.exitPrice),
      contracts: row.contracts,
      pointValue: Number(row.pointValue),
      stopPrice: row.stopPrice !== null ? Number(row.stopPrice) : undefined,
    },
    row.pnlOverride !== null
      ? dollarsToCents(Number(row.pnlOverride))
      : undefined,
  );

  return {
    pnl: formatCentsPlain(result.pnlCents),
    rMultiple: result.rMultiple === null ? "" : result.rMultiple.toFixed(2),
  };
}

/** One trade as one CSV row, in `EXPORT_COLUMNS` order. */
export function tradeToCsvRow(row: ExportTradeRow): string[] {
  const { pnl, rMultiple } = derivePnl(row);

  return [
    row.tradeDate,
    String(row.taken),
    row.instrumentSymbol,
    row.direction,
    number(row.contracts),
    row.entryTime,
    text(row.exitTime),
    row.entryPrice,
    text(row.exitPrice),
    text(row.stopPrice),
    text(row.points),
    text(row.session),
    text(row.setupType),
    text(row.entryModel),
    text(row.result),
    text(row.grade),
    text(row.felt),
    bool(row.byTheBook),
    text(row.mfeR),
    text(row.maeR),
    text(row.postExitMfeR),
    text(row.pnlOverride),
    pnl,
    rMultiple,
    row.confluences.join(LIST_SEPARATOR),
    row.mistakes.join(LIST_SEPARATOR),
    text(row.notes),
    row.links.map((link) => link.url).join(LIST_SEPARATOR),
    row.links.map((link) => link.label ?? "").join(LIST_SEPARATOR),
    String(row.screenshotCount),
    row.accounts.map((account) => account.name).join(LIST_SEPARATOR),
    row.accounts
      .map((account) => String(account.isPractice))
      .join(LIST_SEPARATOR),
    row.createdAt.toISOString(),
  ];
}

/** Header first, then one row per trade. */
export function tradesToCsvRows(rows: ExportTradeRow[]): string[][] {
  return [[...EXPORT_COLUMNS], ...rows.map(tradeToCsvRow)];
}

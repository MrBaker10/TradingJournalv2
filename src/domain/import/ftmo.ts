// Reading an FTMO export: the MetaTrader account history as CSV.
//
// Unlike a fill-level export, one row here is a whole round trip — open time
// and price, close time and price, lots — so nothing is paired. The row is
// read straight into a `RawTrade` and goes on to `normalizeTrades` like a
// paired trip would.
//
// The file is written for a German reader: decimal commas, German column
// names, and times on the broker's server clock (`Europe/Berlin`). Money is
// read as a decimal string into integer minor units and never through a float
// (coding-standards.md, Money).
//
// Like normalize.ts this never throws. A row it cannot read comes back in
// `invalid` with the reason, and the rest of the file goes on.

import type { TradeDirection } from "../pnl.ts";
import type { FtmoColumns } from "./detect.ts";
import { fromWallClock } from "./normalize.ts";
import type { InvalidRow, RawTrade } from "./types.ts";

/** The zone FTMO's server clock — and so every timestamp in the file — runs on. */
export const FTMO_SERVER_ZONE = "Europe/Berlin";

/** A decimal with a comma, as the file writes it: `-0,26000000`. */
const DECIMAL_COMMA = /^(-)?(\d+)(?:,(\d+))?$/;

/** Matches `trades.contracts`, numeric(12, 4). Prices are numeric(13, 5). */
const MAX_QUANTITY_DECIMALS = 4;

/** The file writes eight decimals; money is kept at that scale until summed. */
const MONEY_DECIMALS = 8;
const MONEY_SCALE = BigInt(10) ** BigInt(MONEY_DECIMALS);
const MINOR_UNITS = BigInt(100);
const ZERO = BigInt(0);
const TWO = BigInt(2);

interface ReadFtmo {
  trades: RawTrade[];
  invalid: InvalidRow[];
}

function fieldAt(row: string[], index: number): string {
  return (row[index] ?? "").trim();
}

/** A decimal-comma string as a number, or null. For prices and lots only. */
function readNumber(raw: string): number | null {
  if (!DECIMAL_COMMA.test(raw)) return null;
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

/** A positive price. */
function readPrice(raw: string): number | null {
  const value = readNumber(raw);
  return value !== null && value > 0 ? value : null;
}

/**
 * Lots: positive, and no finer than the column that stores them. `1,88000000`
 * is 1.88; a quantity with a fifth significant decimal would be rounded by
 * the database without anyone having seen it.
 */
function readLots(raw: string): number | null {
  const match = DECIMAL_COMMA.exec(raw);
  if (match === null || match[1] === "-") return null;
  const significant = (match[3] ?? "").replace(/0+$/, "");
  if (significant.length > MAX_QUANTITY_DECIMALS) return null;
  const value = readNumber(raw);
  return value !== null && value > 0 ? value : null;
}

/** An amount as an integer at `MONEY_SCALE`, parsed exactly. Empty is zero. */
function readMoney(raw: string): bigint | null {
  if (raw === "") return ZERO;
  const match = DECIMAL_COMMA.exec(raw);
  if (match === null) return null;
  const [, sign, whole, fraction = ""] = match;
  if (fraction.replace(/0+$/, "").length > MONEY_DECIMALS) return null;
  const scaled = BigInt(
    whole + fraction.padEnd(MONEY_DECIMALS, "0").slice(0, MONEY_DECIMALS),
  );
  return sign === "-" ? -scaled : scaled;
}

/** Minor units, rounded half away from zero like `toUsdCents`. */
function toMinorUnits(scaled: bigint): number {
  const product = scaled * MINOR_UNITS;
  const magnitude = product < ZERO ? -product : product;
  const rounded = (magnitude * TWO + MONEY_SCALE) / (MONEY_SCALE * TWO);
  return Number(product < ZERO ? -rounded : rounded);
}

function readDirection(raw: string): TradeDirection | null {
  const value = raw.toLowerCase();
  if (value === "buy") return "long";
  if (value === "sell") return "short";
  return null;
}

/**
 * The stop, if the file's `SL` can be one (current-feature.md, Stop).
 *
 * `SL` is the stop as it stood at the close. On the loss side of the entry it
 * is the original stop. On the entry or past it, it was moved after a partial,
 * and the original is gone — taking it would make the trade look riskless or
 * give it a negative risk, so it is left out and the preview says why.
 */
function readStop(
  raw: string,
  direction: TradeDirection,
  entryPrice: number,
): { stopPrice: number | null; stopNotice: string | null } | null {
  if (raw === "") {
    return { stopPrice: null, stopNotice: "no SL in the file — not imported" };
  }
  const stop = readPrice(raw);
  if (stop === null) return null;

  const onLossSide =
    direction === "long" ? stop < entryPrice : stop > entryPrice;
  return onLossSide
    ? { stopPrice: stop, stopNotice: null }
    : { stopPrice: null, stopNotice: "SL at or past entry — not imported" };
}

function readRow(
  row: string[],
  columns: FtmoColumns,
  timeZone: string,
  sourceRow: number,
): RawTrade | InvalidRow {
  const ticket = fieldAt(row, columns.ticket);
  if (ticket === "") return { sourceRow, reason: "no ticket" };

  const symbol = fieldAt(row, columns.symbol).toUpperCase();
  if (symbol === "") return { sourceRow, reason: "no symbol" };

  const rawType = fieldAt(row, columns.type);
  const direction = readDirection(rawType);
  if (direction === null) {
    return { sourceRow, reason: `cannot read buy or sell: "${rawType}"` };
  }

  const rawLots = fieldAt(row, columns.lots);
  const contracts = readLots(rawLots);
  if (contracts === null) {
    return { sourceRow, reason: `cannot read lots: "${rawLots}"` };
  }

  const rawEntry = fieldAt(row, columns.entryPrice);
  const entryPrice = readPrice(rawEntry);
  if (entryPrice === null) {
    return { sourceRow, reason: `cannot read open price: "${rawEntry}"` };
  }

  const rawOpen = fieldAt(row, columns.openTime);
  const open = fromWallClock(rawOpen, FTMO_SERVER_ZONE, timeZone);
  if (open === null) {
    return { sourceRow, reason: `cannot read open time: "${rawOpen}"` };
  }

  // A history row is closed; an empty close is read as a position still open,
  // the same way a fill-level file leaves one.
  const rawClose = fieldAt(row, columns.closeTime);
  const rawExit = fieldAt(row, columns.exitPrice);
  let exitTime: string | null = null;
  let exitPrice: number | null = null;
  if (rawClose !== "" || rawExit !== "") {
    const close = fromWallClock(rawClose, FTMO_SERVER_ZONE, timeZone);
    if (close === null) {
      return { sourceRow, reason: `cannot read close time: "${rawClose}"` };
    }
    exitPrice = readPrice(rawExit);
    if (exitPrice === null) {
      return { sourceRow, reason: `cannot read close price: "${rawExit}"` };
    }
    exitTime = close.time;
  }

  const rawStop = fieldAt(row, columns.stopLoss);
  const stop = readStop(rawStop, direction, entryPrice);
  if (stop === null) {
    return { sourceRow, reason: `cannot read SL: "${rawStop}"` };
  }

  // Profit, commission and swap together are what the account was credited.
  const amounts = [columns.profit, columns.commission, columns.swap].map(
    (index) => ({
      raw: fieldAt(row, index),
      value: readMoney(fieldAt(row, index)),
    }),
  );
  const unreadable = amounts.find((amount) => amount.value === null);
  if (unreadable !== undefined) {
    return { sourceRow, reason: `cannot read amount: "${unreadable.raw}"` };
  }
  const total = amounts.reduce(
    (sum, amount) => sum + (amount.value ?? ZERO),
    ZERO,
  );

  return {
    symbol,
    direction,
    contracts,
    tradeDate: open.tradeDate,
    entryTime: open.time,
    entryPrice,
    exitTime,
    exitPrice,
    brokerTradeKey: ticket,
    filePnlCents: exitPrice === null ? null : toMinorUnits(total),
    stopPrice: stop.stopPrice,
    stopNotice: stop.stopNotice,
    // One row is a whole trade; there is no Orders export to join.
    entryOrderId: null,
    exitOrderIds: [],
    sourceRow,
  };
}

/**
 * Reads the data rows of an FTMO export into round trips.
 *
 * @param rows - Data rows only, without the header.
 * @param columns - Where each field sits, from `detectShape`.
 * @param timeZone - The trader's zone, `users.timezone`.
 * @param firstLine - The file line the first data row came from.
 */
export function readFtmoRows(
  rows: string[][],
  columns: FtmoColumns,
  timeZone: string,
  firstLine = 2,
): ReadFtmo {
  const trades: RawTrade[] = [];
  const invalid: InvalidRow[] = [];

  rows.forEach((row, index) => {
    const read = readRow(row, columns, timeZone, index + firstLine);
    if ("reason" in read) {
      invalid.push(read);
    } else {
      trades.push(read);
    }
  });

  return { trades, invalid };
}

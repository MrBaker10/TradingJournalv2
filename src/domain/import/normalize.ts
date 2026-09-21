// Turning the strings in a file into the values the journal stores.
//
// Two passes, because they need different things and run at different points
// of the pipeline:
//
// 1. `normalizeFills` reads the raw rows into `ImportFill`s. It owns the
//    **clock**: a broker timestamp is UTC, `entry_time` is the trader's own
//    chart clock, and this is the one place in the project that converts
//    between them. Afterwards the value is a chart-clock time like any other
//    and is never converted again (coding-standards.md, Time).
// 2. `normalizeTrades` runs on the round trips `fills.ts` has paired. It owns
//    the **instrument**: the symbol is resolved against the journal's own
//    table and the prices are snapped to that instrument's tick.
//
// The order matters and is not interchangeable. `fills.ts` groups by the raw
// symbol, which is the *contract* (`MNQU6`) — resolving it to the journal
// instrument (`MNQ`) any earlier would pool a September position with a
// December one and pair a fill against the wrong position.
//
// Neither pass throws. A row it cannot read comes back in `invalid` with a
// reason in plain English, and the rest of the file goes on
// (current-feature.md, §Grenzen und Validierung).

import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { fromScaledPrice, type TradeDirection, toScaledPrice } from "../pnl.ts";
import type { FillColumns } from "./detect.ts";
import type {
  ImportFill,
  InvalidRow,
  NormalizedTrade,
  RawTrade,
} from "./types.ts";

/** An instrument as the journal knows it. `tickSize` is `instruments.tick_size`. */
export interface InstrumentRef {
  id: number;
  symbol: string;
  tickSize: number;
}

/**
 * A futures contract month: one letter from the standard set plus the year.
 * `MNQU6` is September 2026 Micro Nasdaq; the journal knows only `MNQ`.
 *
 * The leading group is lazy so a product name that itself ends in a digit
 * survives: `M2KZ6` has to split as `M2K` + `Z6`, not `M` + `2KZ6`.
 */
const CONTRACT_MONTH = /^(.+?)([FGHJKMNQUVXZ]\d{1,2})$/;

interface Normalized<T> {
  rows: T[];
  invalid: InvalidRow[];
}

/** What `normalizeFills` hands to `pairFills`, plus the rows it had to drop. */
interface NormalizedFills {
  fills: ImportFill[];
  invalid: InvalidRow[];
}

function fieldAt(row: string[], index: number): string {
  return (row[index] ?? "").trim();
}

/**
 * A count of contracts: a positive whole number. A fill of zero is not a fill
 * and a fractional one is not a futures position.
 */
function readContracts(raw: string): number | null {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

/** A price: finite and positive, with a decimal point and no thousands mark. */
function readPrice(raw: string): number | null {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Tradovate's `_action`: 0 is a buy, 1 is a sell. The display column `B/S`
 * says the same thing in words and is accepted as a fallback, because a file
 * hand-edited in a spreadsheet may have lost the numeric column.
 */
function readDirection(raw: string): TradeDirection | null {
  const value = raw.toLowerCase();
  if (value === "0" || value === "buy") return "long";
  if (value === "1" || value === "sell") return "short";
  return null;
}

/**
 * The trader's chart-clock date and time for a broker timestamp.
 *
 * Both come out of the **same converted instant**. Taking the date from the
 * file's own date column instead would split them: a fill at 23:30 UTC is
 * already the next day in Berlin, and the calendar would then disagree with
 * the clock printed next to it.
 */
function onChartClock(
  raw: string,
  timeZone: string,
): { tradeDate: string; entryTime: string; instant: string } | null {
  // `2026-08-13 15:57:01.616Z` is not an ISO string until the space is a T.
  const instant = new Date(raw.trim().replace(" ", "T"));
  if (Number.isNaN(instant.getTime())) return null;

  const local = new TZDate(instant, timeZone);
  return {
    tradeDate: format(local, "yyyy-MM-dd"),
    entryTime: format(local, "HH:mm:ss"),
    // UTC, so that sorting fills against each other stays correct across a
    // day boundary and across a summer-time changeover.
    instant: instant.toISOString(),
  };
}

/**
 * One row as a fill, or the reason it could not be read. Every check names
 * the value it choked on, because "invalid row" alone gives the user nothing
 * to go and look at.
 */
function readFill(
  row: string[],
  columns: FillColumns,
  timeZone: string,
  sourceRow: number,
): ImportFill | InvalidRow {
  const fillId = fieldAt(row, columns.fillId);
  if (fillId === "") return { sourceRow, reason: "no fill id" };

  const symbol = fieldAt(row, columns.contract).toUpperCase();
  if (symbol === "") return { sourceRow, reason: "no contract" };

  const rawAction = fieldAt(row, columns.action);
  const direction = readDirection(rawAction);
  if (direction === null) {
    return { sourceRow, reason: `cannot read buy or sell: "${rawAction}"` };
  }

  const rawQuantity = fieldAt(row, columns.quantity);
  const contracts = readContracts(rawQuantity);
  if (contracts === null) {
    return { sourceRow, reason: `cannot read quantity: "${rawQuantity}"` };
  }

  const rawPrice = fieldAt(row, columns.price);
  const price = readPrice(rawPrice);
  if (price === null) {
    return { sourceRow, reason: `cannot read price: "${rawPrice}"` };
  }

  const rawTime = fieldAt(row, columns.timestamp);
  const clock = onChartClock(rawTime, timeZone);
  if (clock === null) {
    return { sourceRow, reason: `cannot read time: "${rawTime}"` };
  }

  return {
    fillId,
    symbol,
    direction,
    contracts,
    price,
    timestamp: clock.instant,
    tradeDate: clock.tradeDate,
    entryTime: clock.entryTime,
    sourceRow,
  };
}

/**
 * Reads the data rows of a fill-level export.
 *
 * @param rows - Data rows only, without the header.
 * @param columns - Where each field sits, from `detectShape`.
 * @param timeZone - The trader's zone, `users.timezone`.
 * @param firstLine - The file line the first data row came from. The header
 *   makes it 2, which is what a spreadsheet shows.
 */
export function normalizeFills(
  rows: string[][],
  columns: FillColumns,
  timeZone: string,
  firstLine = 2,
): NormalizedFills {
  const fills: ImportFill[] = [];
  const invalid: InvalidRow[] = [];

  rows.forEach((row, index) => {
    const sourceRow = index + firstLine;
    const fill = readFill(row, columns, timeZone, sourceRow);

    if ("reason" in fill) {
      invalid.push(fill);
    } else {
      fills.push(fill);
    }
  });

  return { fills, invalid };
}

/**
 * The journal instrument a contract symbol belongs to, or null.
 *
 * The full symbol is tried first, so a file that already writes `MNQ` needs
 * no stripping at all; only then is the contract month removed. An unknown
 * symbol is never invented as a new instrument — an instrument without a real
 * point value would falsify every P&L figure computed from it
 * (current-feature.md, §Regeln).
 */
function resolveInstrument(
  symbol: string,
  bySymbol: Map<string, InstrumentRef>,
): InstrumentRef | null {
  const direct = bySymbol.get(symbol);
  if (direct !== undefined) return direct;

  const match = CONTRACT_MONTH.exec(symbol);
  if (match === null) return null;

  return bySymbol.get(match[1]) ?? null;
}

/**
 * The nearest multiple of the instrument's tick, in fixed point.
 *
 * A weighted average over several fills lands between ticks by construction,
 * and a price that is not on the grid is not a price the market ever traded.
 */
function snapToTick(price: number, tickSize: number): number {
  const tick = toScaledPrice(tickSize);
  if (tick <= BigInt(0)) return price;

  // Half-up at the stored precision. Prices are validated positive, so the
  // truncating BigInt division is a floor and the added half rounds up.
  const scaled = toScaledPrice(price);
  return fromScaledPrice(((scaled + tick / BigInt(2)) / tick) * tick);
}

/**
 * Resolves the round trips against the instrument table and snaps their
 * prices to the tick. This is the first reader of `instruments.tick_size` in
 * the project.
 */
export function normalizeTrades(
  trades: RawTrade[],
  instruments: InstrumentRef[],
): Normalized<NormalizedTrade> {
  const bySymbol = new Map(
    instruments.map((instrument) => [
      instrument.symbol.toUpperCase(),
      instrument,
    ]),
  );

  const rows: NormalizedTrade[] = [];
  const invalid: InvalidRow[] = [];

  for (const trade of trades) {
    const instrument = resolveInstrument(trade.symbol, bySymbol);
    if (instrument === null) {
      invalid.push({
        sourceRow: trade.sourceRow,
        reason: `unknown symbol: ${trade.symbol}`,
      });
      continue;
    }

    rows.push({
      instrumentId: instrument.id,
      direction: trade.direction,
      contracts: trade.contracts,
      tradeDate: trade.tradeDate,
      entryTime: trade.entryTime,
      entryPrice: snapToTick(trade.entryPrice, instrument.tickSize),
      exitTime: trade.exitTime,
      exitPrice:
        trade.exitPrice === null
          ? null
          : snapToTick(trade.exitPrice, instrument.tickSize),
      brokerTradeKey: trade.brokerTradeKey,
      filePnl: trade.filePnl,
      sourceRow: trade.sourceRow,
    });
  }

  return { rows, invalid };
}

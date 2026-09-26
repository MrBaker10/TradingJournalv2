// The shapes every import module passes around. Pure data, no DB ids the
// caller hasn't resolved yet, no `Date` — the clock and the instrument table
// are arguments, never ambients (coding-standards.md, Domain logic).

import type { TradeDirection } from "../pnl.ts";

/** What `detect.ts` recognised a file as. Stored on the batch. */
export type ImportShape = "round-trip" | "fills" | "tradingview" | "ftmo";

/**
 * One fill straight out of a fill-level file, after the columns have been
 * read but before anything is paired.
 *
 * `timestamp` is an opaque sortable string, not a `Date`: it is only ever used
 * to order fills against each other, and parsing it into a `Date` would invite
 * a timezone conversion that `entry_time` must never see.
 */
export interface ImportFill {
  fillId: string;
  /**
   * The order the fill executed, when the file names it. Only used to join a
   * Tradovate Orders export onto the round trip (tradovate-orders.ts).
   */
  orderId: string | null;
  symbol: string;
  direction: TradeDirection;
  contracts: number;
  price: number;
  /** Sortable as a string, e.g. `2026-08-20 09:48:02.355`. */
  timestamp: string;
  /** Chart-clock date and time, as the trader's own clock reads them. */
  tradeDate: string;
  entryTime: string;
  /** 1-based line in the source file, so the preview can point at a row. */
  sourceRow: number;
}

/**
 * A round trip, before the instrument symbol has been resolved and the prices
 * rounded to the tick. This is what `fills.ts` produces and what a round-trip
 * or TradingView file yields directly.
 *
 * `exitPrice` and `exitTime` are null for a position the file never closes.
 */
export interface RawTrade {
  symbol: string;
  direction: TradeDirection;
  contracts: number;
  tradeDate: string;
  entryTime: string;
  entryPrice: number;
  exitTime: string | null;
  exitPrice: number | null;
  /** Tier 1 key when the file carries one, else null. */
  brokerTradeKey: string | null;
  /**
   * The file's own P&L in integer minor units of the account currency, or
   * null when the file reports none. A fill-level file never does; an FTMO
   * row does, and that amount becomes the trade's P&L.
   */
  filePnlCents: number | null;
  /** The initial stop, when the file carries one that can be a stop. */
  stopPrice: number | null;
  /** Why a stop in the file was not taken, shown next to the row. */
  stopNotice: string | null;
  /**
   * The order that opened the position and the orders that closed it, when a
   * fill-level file names them. They join an Orders export onto the trip and
   * go no further: `normalizeTrades` drops them.
   */
  entryOrderId: string | null;
  exitOrderIds: string[];
  /** 1-based line in the source file, so the preview can point at a row. */
  sourceRow: number;
}

/**
 * A row that survived normalisation: the symbol resolved to a journal
 * instrument, prices snapped to that instrument's tick, ready to be matched
 * and written.
 */
export interface NormalizedTrade {
  instrumentId: number;
  direction: TradeDirection;
  contracts: number;
  tradeDate: string;
  entryTime: string;
  entryPrice: number;
  exitTime: string | null;
  exitPrice: number | null;
  brokerTradeKey: string | null;
  filePnlCents: number | null;
  stopPrice: number | null;
  stopNotice: string | null;
  sourceRow: number;
}

/** A row that could not be read, with the reason the preview shows. */
export interface InvalidRow {
  sourceRow: number;
  reason: string;
}

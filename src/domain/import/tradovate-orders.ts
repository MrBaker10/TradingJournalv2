// The initial stop of a Tradovate round trip, from the platform's Orders export.
//
// The fills export carries no stop at all. The Orders export does, but only in
// the version the order had at its **last change**: a stop that was trailed
// shows where it ended up, not where it started, and R needs where it started
// (decisions.md, S12b). So a stop is taken only when nothing can have moved
// it — its last change falls in the very second the entry filled — and every
// other stop order found for the trip becomes a notice instead
// (current-feature.md, tradovate-orders-stop).
//
// The Orders file has no UTC column; both of its times are in the platform's
// display zone. They are therefore compared only with each other, never with
// a time out of the fills file, and never converted.
//
// Like the rest of the import this never throws. An order row that cannot be
// read is simply not a candidate.

import type { TradeDirection } from "../pnl.ts";
import type { OrderColumns } from "./detect.ts";
import type { RawTrade } from "./types.ts";

/** One order out of the export, as far as a stop needs it. */
export interface TradovateOrder {
  orderId: string;
  /** The side the order trades: `long` buys, `short` sells. */
  side: TradeDirection;
  contract: string;
  isStop: boolean;
  stopPrice: number | null;
  /** `YYYY-MM-DD HH:MM:SS` on the display clock, null while unfilled. */
  fillTime: string | null;
  /** `YYYY-MM-DD HH:MM:SS` on the display clock. */
  lastChange: string;
}

export const STOP_MOVED = "stop moved after entry — not imported";
export const STOP_BEFORE_ENTRY = "stop placed before entry — not imported";
export const STOP_PAST_ENTRY = "stop at or past entry — not imported";
export const STOPS_DISAGREE = "several stops at entry — not imported";

/** `09/14/2026 16:30:00`, the way Tradovate prints a display time. */
const DISPLAY_TIME = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/;

/** An order id as Tradovate writes it: digits only, growing over time. */
const ORDER_ID = /^\d+$/;

function fieldAt(row: string[], index: number): string {
  return (row[index] ?? "").trim();
}

/** A display time as a sortable string, or null. No zone is applied. */
function readDisplayTime(raw: string): string | null {
  const match = DISPLAY_TIME.exec(raw);
  if (match === null) return null;
  const [, month, day, year, hour, minute, second] = match;
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function readSide(raw: string): TradeDirection | null {
  const value = raw.toLowerCase();
  if (value === "buy") return "long";
  if (value === "sell") return "short";
  return null;
}

/** A price: finite and positive, with a decimal point and no thousands mark. */
function readPrice(raw: string): number | null {
  if (raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * The data rows of an Orders export. A row missing its id, side, contract or
 * last-change time is dropped: it could not be placed against a trade anyway.
 */
export function readOrders(
  rows: string[][],
  columns: OrderColumns,
): TradovateOrder[] {
  const orders: TradovateOrder[] = [];

  for (const row of rows) {
    const orderId = fieldAt(row, columns.orderId);
    const side = readSide(fieldAt(row, columns.side));
    const contract = fieldAt(row, columns.contract).toUpperCase();
    const lastChange = readDisplayTime(fieldAt(row, columns.lastChange));
    if (!ORDER_ID.test(orderId) || side === null || contract === "") continue;
    if (lastChange === null) continue;

    orders.push({
      orderId,
      side,
      contract,
      isStop: fieldAt(row, columns.type).toLowerCase() === "stop",
      stopPrice: readPrice(fieldAt(row, columns.stopPrice)),
      fillTime: readDisplayTime(fieldAt(row, columns.fillTime)),
      lastChange,
    });
  }

  return orders;
}

/** Tradovate's order ids grow with every order placed. Both must be digits. */
function after(a: string, b: string): boolean {
  return BigInt(a) > BigInt(b);
}

function byOrderId(a: string, b: string): number {
  return after(a, b) ? 1 : after(b, a) ? -1 : 0;
}

function onLossSide(
  direction: TradeDirection,
  entryPrice: number,
  stop: number,
): boolean {
  return direction === "long" ? stop < entryPrice : stop > entryPrice;
}

/** The latest fill time among the orders that closed the trip. */
function exitTimeOf(
  trade: RawTrade,
  byId: Map<string, TradovateOrder>,
): string | null {
  let latest: string | null = null;
  for (const id of trade.exitOrderIds) {
    const time = byId.get(id)?.fillTime ?? null;
    if (time !== null && (latest === null || time > latest)) latest = time;
  }
  return latest;
}

/**
 * The stop orders that belong to one trip: same contract, the other side,
 * placed after the entry order and before the next trip's entry order, and
 * last changed while the position was open. That last condition is what
 * drops the bracket of an entry that was cancelled before it ever filled.
 */
function candidatesFor(
  trade: RawTrade,
  entryOrderId: string,
  nextEntryOrderId: string | null,
  exitTime: string | null,
  orders: TradovateOrder[],
): TradovateOrder[] {
  const stopSide: TradeDirection =
    trade.direction === "long" ? "short" : "long";

  return orders.filter(
    (order) =>
      order.isStop &&
      order.stopPrice !== null &&
      order.contract === trade.symbol.toUpperCase() &&
      order.side === stopSide &&
      after(order.orderId, entryOrderId) &&
      (nextEntryOrderId === null || after(nextEntryOrderId, order.orderId)) &&
      (exitTime === null ||
        order.lastChange <= exitTime ||
        trade.exitOrderIds.includes(order.orderId)),
  );
}

function withStop(
  trade: RawTrade,
  entryFill: string,
  candidates: TradovateOrder[],
): RawTrade {
  if (candidates.length === 0) return trade;

  const atEntry = candidates.filter((order) => order.lastChange === entryFill);
  if (atEntry.length === 0) {
    const early = candidates.some((order) => order.lastChange < entryFill);
    return {
      ...trade,
      stopNotice: early ? STOP_BEFORE_ENTRY : STOP_MOVED,
    };
  }

  const prices = new Set(atEntry.map((order) => order.stopPrice));
  if (prices.size > 1) return { ...trade, stopNotice: STOPS_DISAGREE };

  const [stop] = prices;
  if (stop === null || stop === undefined) return trade;
  if (!onLossSide(trade.direction, trade.entryPrice, stop)) {
    return { ...trade, stopNotice: STOP_PAST_ENTRY };
  }
  return { ...trade, stopPrice: stop, stopNotice: null };
}

/**
 * Fills in `stopPrice` / `stopNotice` of every round trip the Orders export
 * covers. A trip whose entry order is not in the export — the fills file
 * usually reaches further back — comes back unchanged and without a notice.
 */
export function applyOrderStops(
  trades: RawTrade[],
  orders: TradovateOrder[],
): RawTrade[] {
  const byId = new Map(orders.map((order) => [order.orderId, order]));

  // The next trip on the same contract bounds which stop orders can still
  // belong to this one.
  const nextEntry = new Map<RawTrade, string | null>();
  const byContract = new Map<string, { trade: RawTrade; id: string }[]>();
  for (const trade of trades) {
    const id = trade.entryOrderId;
    if (id === null || !ORDER_ID.test(id)) continue;
    const key = trade.symbol.toUpperCase();
    const group = byContract.get(key);
    if (group === undefined) {
      byContract.set(key, [{ trade, id }]);
    } else {
      group.push({ trade, id });
    }
  }
  for (const group of byContract.values()) {
    const ordered = [...group].sort((a, b) => byOrderId(a.id, b.id));
    ordered.forEach(({ trade }, index) => {
      nextEntry.set(trade, ordered[index + 1]?.id ?? null);
    });
  }

  return trades.map((trade) => {
    const id = trade.entryOrderId;
    if (id === null || !ORDER_ID.test(id) || trade.stopPrice !== null) {
      return trade;
    }

    const entryFill = byId.get(id)?.fillTime ?? null;
    if (entryFill === null) return trade;

    const candidates = candidatesFor(
      trade,
      id,
      nextEntry.get(trade) ?? null,
      exitTimeOf(trade, byId),
      orders,
    );
    return withStop(trade, entryFill, candidates);
  });
}

// Turning a fill-level export into round trips.
//
// A broker that reports every fill gives us N rows for one trade. They are
// paired **FIFO per instrument, in timestamp order**, and a position is a
// round trip the moment its cumulative quantity returns to zero
// (current-feature.md, §Scope).
//
// Two things this module does not do: it does not resolve the symbol to a
// journal instrument and it does not snap prices to a tick — both belong to
// `normalize.ts`, which is the module that knows the instruments table. What
// comes out here is still a `RawTrade`, which says per leg whether its price
// is an average so `normalize.ts` knows whether it may snap it.
//
// The broker's commission travels with the fills: a round trip carries the
// sum of what its fills were charged. A fill that closes one position and
// opens the next splits its charge by quantity (commissionShare).

import { commissionShare } from "../commission.ts";
import { fromScaledPrice, type TradeDirection, toScaledPrice } from "../pnl.ts";
import type { ImportFill, RawTrade } from "./types.ts";

// A weighted average over several fills is arithmetic on prices, so it runs
// at the stored precision: the sum accumulates in BigInt and the division back
// to a plain number happens once, at the end.

interface Leg {
  /** Sum of price * quantity, at the stored price precision. */
  notional: bigint;
  quantity: number;
  fillIds: string[];
  lastTime: string;
  /** Every distinct price the leg filled at, at the stored precision. */
  prices: Set<bigint>;
}

interface OpenTrip {
  symbol: string;
  direction: TradeDirection;
  entry: Leg;
  exit: Leg;
  tradeDate: string;
  entryTime: string;
  entryOrderId: string | null;
  exitOrderIds: string[];
  sourceRow: number;
  /** Sum of the fills' charges; null once any fill's charge is unknown. */
  commissionCents: number | null;
}

function emptyLeg(): Leg {
  return {
    notional: BigInt(0),
    quantity: 0,
    fillIds: [],
    lastTime: "",
    prices: new Set(),
  };
}

function addToLeg(leg: Leg, price: number, quantity: number, fill: ImportFill) {
  const scaled = toScaledPrice(price);
  leg.notional += scaled * BigInt(quantity);
  leg.quantity += quantity;
  leg.fillIds.push(fill.fillId);
  leg.lastTime = fill.entryTime;
  leg.prices.add(scaled);
}

/**
 * Adds the part of a fill's charge that belongs to `quantity` of it. The
 * caller passes the rest of the same fill to the next trip, so a split fill
 * is charged exactly once in total.
 */
function addCommission(trip: OpenTrip, cents: number | null) {
  trip.commissionCents =
    trip.commissionCents === null || cents === null
      ? null
      : trip.commissionCents + cents;
}

function chargeFor(
  fill: ImportFill,
  quantity: number,
  alreadyCharged: number,
): number | null {
  if (fill.commissionCents === null) return null;
  if (alreadyCharged + quantity === fill.contracts) {
    // The last part of the fill takes whatever the earlier parts left over.
    return (
      fill.commissionCents -
      commissionShare(fill.commissionCents, alreadyCharged, fill.contracts)
    );
  }
  return commissionShare(fill.commissionCents, quantity, fill.contracts);
}

/**
 * The size-weighted average price of a leg, rounded half-up to the five
 * decimals `numeric(13,5)` stores. Null for an empty leg, which is how an
 * unclosed position reports its exit.
 */
function averagePrice(leg: Leg): number | null {
  if (leg.quantity === 0) return null;

  const denominator = BigInt(leg.quantity);
  const rounded = (leg.notional + denominator / BigInt(2)) / denominator;
  return fromScaledPrice(rounded);
}

/**
 * The tier 1 key for a round trip: its fill ids, sorted and joined.
 *
 * The spec calls this a hash. It is a join instead, because a hash can
 * collide and a tier 1 hit is treated as an exact match with no tolerance —
 * two unrelated round trips sharing a key would silently skip or overwrite a
 * real trade. Sorting makes it independent of the order the fills arrived in.
 *
 * A round trip with so many fills that the key would not fit an index entry
 * gets no key at all and falls through to tier 2, which is exact as well.
 */
const MAX_KEY_LENGTH = 500;

function brokerKeyOf(fillIds: string[]): string | null {
  const key = [...fillIds].sort().join("|");
  return key.length === 0 || key.length > MAX_KEY_LENGTH ? null : key;
}

function closeTrip(trip: OpenTrip): RawTrade {
  return {
    symbol: trip.symbol,
    direction: trip.direction,
    contracts: trip.entry.quantity,
    tradeDate: trip.tradeDate,
    entryTime: trip.entryTime,
    entryPrice: averagePrice(trip.entry) ?? 0,
    exitTime: trip.exit.quantity === 0 ? null : trip.exit.lastTime,
    exitPrice: averagePrice(trip.exit),
    brokerTradeKey: brokerKeyOf([...trip.entry.fillIds, ...trip.exit.fillIds]),
    // A fill-level file reports prices, not a per-trade P&L, and no stop.
    filePnlCents: null,
    fileCommissionCents: trip.commissionCents,
    entryAveraged: trip.entry.prices.size > 1,
    exitAveraged: trip.exit.prices.size > 1,
    stopPrice: null,
    stopNotice: null,
    entryOrderId: trip.entryOrderId,
    exitOrderIds: trip.exitOrderIds,
    sourceRow: trip.sourceRow,
  };
}

function openTrip(
  fill: ImportFill,
  quantity: number,
  commissionCents: number | null,
): OpenTrip {
  const trip: OpenTrip = {
    symbol: fill.symbol,
    direction: fill.direction,
    entry: emptyLeg(),
    exit: emptyLeg(),
    // A round trip is dated and timed by its **entry**. An overnight position
    // that closes after midnight belongs to the day it was opened, the same
    // way the New Trade form treats one.
    tradeDate: fill.tradeDate,
    entryTime: fill.entryTime,
    // The order that opened the position, for joining an Orders export.
    // A position scaled into over several orders keeps the first.
    entryOrderId: fill.orderId,
    exitOrderIds: [],
    // The line the position was opened on. A round trip spans several lines;
    // the entry is the one the preview points at.
    sourceRow: fill.sourceRow,
    commissionCents,
  };
  addToLeg(trip.entry, fill.price, quantity, fill);
  return trip;
}

function groupBySymbol(fills: ImportFill[]): Map<string, ImportFill[]> {
  const groups = new Map<string, ImportFill[]>();
  for (const fill of fills) {
    const group = groups.get(fill.symbol);
    if (group === undefined) {
      groups.set(fill.symbol, [fill]);
    } else {
      group.push(fill);
    }
  }
  return groups;
}

/**
 * Pairs fills into round trips.
 *
 * A fill in the open position's direction adds to it. A fill against it
 * closes, up to the open quantity; whatever is left over of that same fill
 * opens a new position in the other direction, which is how a flip through
 * zero becomes two round trips rather than one confused one.
 *
 * A position the file never closes comes back as a round trip with no exit
 * price and no exit time. It lands in the journal as an open trade, and a
 * later import of the closing fill updates it through the normal update
 * rules (current-feature.md, §Regeln).
 */
export function pairFills(fills: ImportFill[]): RawTrade[] {
  const trades: RawTrade[] = [];

  for (const [, group] of groupBySymbol(fills)) {
    const ordered = [...group].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp),
    );

    let open: OpenTrip | null = null;

    for (const fill of ordered) {
      let remaining = fill.contracts;

      if (open !== null && open.direction !== fill.direction) {
        const openQuantity = open.entry.quantity - open.exit.quantity;
        const closing = Math.min(remaining, openQuantity);

        addToLeg(open.exit, fill.price, closing, fill);
        addCommission(open, chargeFor(fill, closing, 0));
        if (
          fill.orderId !== null &&
          !open.exitOrderIds.includes(fill.orderId)
        ) {
          open.exitOrderIds.push(fill.orderId);
        }
        remaining -= closing;

        if (open.exit.quantity === open.entry.quantity) {
          trades.push(closeTrip(open));
          open = null;
        }
      }

      if (remaining === 0) continue;

      const charge = chargeFor(fill, remaining, fill.contracts - remaining);
      if (open === null) {
        open = openTrip(fill, remaining, charge);
      } else {
        addToLeg(open.entry, fill.price, remaining, fill);
        addCommission(open, charge);
      }
    }

    if (open !== null) {
      trades.push(closeTrip(open));
    }
  }

  return trades;
}

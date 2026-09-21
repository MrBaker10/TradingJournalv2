// What happens to one import row once the match has been looked up: skip,
// update or new — and on an update, exactly which fields may be written.
//
// This module is the fence the whole feature rests on. The write set it
// returns is built only from the broker-owned list, so no field a user filled
// in can ever end up in an import's UPDATE statement
// (current-feature.md, §Was ein Update überschreiben darf).
//
// Two rules that are easy to get backwards:
//
// - **An import fills gaps, it never makes them.** A file that carries no exit
//   leaves a closed trade closed. The alternative — writing null over an exit
//   because this file did not know about it — would reopen a finished trade.
// - **Comparisons happen at the precision the column stores.** A price out of
//   postgres is `numeric(12,4)` and a time is `HH:MM:SS`; comparing either as
//   it arrives against what the file wrote reports changes that are not real.

import type { TradeDirection } from "../pnl.ts";
import type { NormalizedTrade } from "./types.ts";

/** Matches `resultEnum` in src/schemas/trades.ts. */
export type TradeResult = "Win" | "Loss" | "Breakeven" | "Scratch";

/**
 * The only fields an import may write on a trade it did not create in this
 * batch. Everything absent from this list is the user's
 * (current-feature.md).
 */
export const BROKER_OWNED_FIELDS = [
  "tradeDate",
  "instrumentId",
  "direction",
  "contracts",
  "entryTime",
  "exitTime",
  "entryPrice",
  "exitPrice",
  "points",
  "result",
] as const;

export type BrokerOwnedField = (typeof BROKER_OWNED_FIELDS)[number];

/** The journal side of a match, as the query hands it over. */
export interface ExistingTrade {
  id: number;
  instrumentId: number;
  direction: TradeDirection;
  contracts: number | null;
  tradeDate: string;
  entryTime: string;
  exitTime: string | null;
  entryPrice: number;
  exitPrice: number | null;
  points: number | null;
  result: string | null;
}

export interface BrokerValues {
  tradeDate?: string;
  instrumentId?: number;
  direction?: TradeDirection;
  contracts?: number;
  entryTime?: string;
  exitTime?: string;
  entryPrice?: number;
  exitPrice?: number;
  points?: number;
  result?: TradeResult;
}

export type RowOutcome =
  | { kind: "new" }
  | { kind: "skip"; tradeId: number }
  | {
      kind: "update";
      tradeId: number;
      changed: BrokerOwnedField[];
      values: BrokerValues;
    };

// numeric(12,4), the precision every price column in this project uses.
const PRICE_SCALE = 10_000;

function atStoredPrecision(price: number): number {
  return Math.round(price * PRICE_SCALE);
}

/**
 * `HH:MM` and `HH:MM:SS` mean the same instant on the chart clock. Postgres
 * always hands back the long form, the file may write either.
 */
function atStoredTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

/**
 * Points captured: a plain signed subtraction, exactly as `createTrade`
 * derives it. It deliberately does not go through `calculatePnl`'s BigInt
 * path — a single subtraction without a multiplication chain does not need
 * the scaling procedure that money values do (decisions.md, S4).
 */
export function derivePoints(
  direction: TradeDirection,
  entryPrice: number,
  exitPrice: number | null,
): number | null {
  if (exitPrice === null) return null;
  const points =
    direction === "long" ? exitPrice - entryPrice : entryPrice - exitPrice;
  // Back to the four decimals the column stores, so float noise from the
  // subtraction never reaches postgres.
  return Math.round(points * PRICE_SCALE) / PRICE_SCALE;
}

/**
 * Win, Loss or Breakeven from the sign of the trade.
 *
 * It reads `points` rather than a P&L amount because the two always share a
 * sign — point value and contract count are both positive — and reading
 * points keeps this module clear of the instruments table.
 *
 * **Scratch is never derived.** It is the trader's judgement about how the
 * trade was executed, not something a number can say, so it only ever arrives
 * by hand (decided 2026-09-18).
 */
export function deriveResult(points: number | null): TradeResult | null {
  if (points === null) return null;
  if (points > 0) return "Win";
  if (points < 0) return "Loss";
  return "Breakeven";
}

interface Comparison {
  field: BrokerOwnedField;
  changed: boolean;
  value: BrokerValues[BrokerOwnedField];
}

function compare<T>(
  field: BrokerOwnedField,
  incoming: T | null,
  current: T | null,
  equals: (a: T, b: T) => boolean,
): Comparison {
  // An import fills gaps and never makes them: nothing to say about a field
  // this file does not carry.
  if (incoming === null) {
    return { field, changed: false, value: undefined };
  }
  const changed = current === null || !equals(incoming, current);
  return { field, changed, value: changed ? (incoming as never) : undefined };
}

const sameNumber = (a: number, b: number) => a === b;
const sameString = (a: string, b: string) => a === b;
const samePrice = (a: number, b: number) =>
  atStoredPrecision(a) === atStoredPrecision(b);
const sameTime = (a: string, b: string) => atStoredTime(a) === atStoredTime(b);

/**
 * Decides what to do with one normalized row.
 *
 * `existing` is the trade tier 1 or tier 2 matched, or null when neither
 * found anything. A match plus no differing broker field is a skip; a match
 * plus at least one differing or missing one is an update carrying only those
 * fields.
 */
export function decideOutcome(
  incoming: NormalizedTrade,
  existing: ExistingTrade | null,
): RowOutcome {
  if (existing === null) return { kind: "new" };

  const points = derivePoints(
    incoming.direction,
    incoming.entryPrice,
    incoming.exitPrice,
  );

  const comparisons: Comparison[] = [
    compare("tradeDate", incoming.tradeDate, existing.tradeDate, sameString),
    compare(
      "instrumentId",
      incoming.instrumentId,
      existing.instrumentId,
      sameNumber,
    ),
    compare("direction", incoming.direction, existing.direction, sameString),
    compare("contracts", incoming.contracts, existing.contracts, sameNumber),
    compare("entryTime", incoming.entryTime, existing.entryTime, sameTime),
    compare("exitTime", incoming.exitTime, existing.exitTime, sameTime),
    compare("entryPrice", incoming.entryPrice, existing.entryPrice, samePrice),
    compare("exitPrice", incoming.exitPrice, existing.exitPrice, samePrice),
    compare("points", points, existing.points, samePrice),
    compare("result", deriveResult(points), existing.result, sameString),
  ];

  const changed = comparisons.filter((comparison) => comparison.changed);
  if (changed.length === 0) {
    return { kind: "skip", tradeId: existing.id };
  }

  const values: BrokerValues = {};
  for (const comparison of changed) {
    Object.assign(values, { [comparison.field]: comparison.value });
  }

  return {
    kind: "update",
    tradeId: existing.id,
    changed: changed.map((comparison) => comparison.field),
    values,
  };
}

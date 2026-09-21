import { dollarsToCents } from "../lib/money.ts";

export type TradeDirection = "long" | "short";

export interface PnlInput {
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  contracts: number;
  pointValue: number;
  stopPrice?: number;
}

export interface PnlResult {
  pnlCents: number;
  rMultiple: number | null;
}

// Matches numeric(12,4): every price and the point value are scaled to an
// integer at this precision so the multiplication chain below runs in exact
// BigInt arithmetic instead of compounding float error across three factors.
const PRICE_SCALE = BigInt(10_000);
const ZERO = BigInt(0);

/**
 * A price as the integer `numeric(12,4)` stores, so arithmetic on it is exact.
 *
 * Exported because the import pipeline needs the same scale in four places —
 * pairing fills, snapping to the tick, keying a match and deriving points —
 * and a second copy of the constant is a second definition of what a price is.
 */
export function toScaledPrice(value: number): bigint {
  if (!Number.isFinite(value)) {
    throw new RangeError(`value must be finite, got ${value}`);
  }
  return BigInt(Math.round(value * Number(PRICE_SCALE)));
}

/** The inverse: one float division, once, at the end of a calculation. */
export function fromScaledPrice(scaled: bigint): number {
  return Number(scaled) / Number(PRICE_SCALE);
}

// scaledDollars is priceScale^2 * dollars; the float division back to a plain
// dollar amount happens exactly once, after the multiplication itself ran
// entirely in BigInt.
function scaledToCents(scaledDollars: bigint): number {
  return dollarsToCents(
    Number(scaledDollars) / Number(PRICE_SCALE * PRICE_SCALE),
  );
}

function pointsCapturedScaled(input: PnlInput): bigint {
  const entry = toScaledPrice(input.entryPrice);
  const exit = toScaledPrice(input.exitPrice);
  return input.direction === "long" ? exit - entry : entry - exit;
}

export function calculatePnl(
  input: PnlInput,
  overridePnlCents?: number,
): PnlResult {
  const pointValueScaled = toScaledPrice(input.pointValue);
  const contracts = BigInt(input.contracts);

  const derivedPnlCents = scaledToCents(
    pointsCapturedScaled(input) * pointValueScaled * contracts,
  );
  const pnlCents = overridePnlCents ?? derivedPnlCents;

  if (input.stopPrice === undefined) {
    return { pnlCents, rMultiple: null };
  }

  const riskScaled =
    toScaledPrice(input.entryPrice) - toScaledPrice(input.stopPrice);
  const initialRiskCents = scaledToCents(
    (riskScaled < ZERO ? -riskScaled : riskScaled) *
      pointValueScaled *
      contracts,
  );

  if (initialRiskCents === 0) {
    return { pnlCents, rMultiple: null };
  }

  return {
    pnlCents,
    rMultiple: pnlCents / initialRiskCents,
  };
}

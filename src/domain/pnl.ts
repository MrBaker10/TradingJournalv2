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

// Cents per dollar, as a BigInt for the rounding below.
const CENTS = BigInt(100);
const TWO = BigInt(2);

/**
 * An exact quotient rounded to the nearest integer, halves towards +infinity —
 * the same rule as `Math.round`, so a whole-contract trade lands on exactly the
 * cents the float path produced before quantities could be fractional.
 */
function roundDiv(numerator: bigint, denominator: bigint): bigint {
  const doubled = numerator * TWO + denominator;
  const divisor = denominator * TWO;
  const quotient = doubled / divisor;
  // BigInt division truncates towards zero; step down once for a negative
  // remainder so the result is a floor, not a truncation.
  return doubled % divisor < ZERO ? quotient - BigInt(1) : quotient;
}

// The product of points, point value and quantity, each at PRICE_SCALE, is
// dollars at PRICE_SCALE^3. It is rounded to cents in BigInt: with a fractional
// quantity the product no longer fits a float without losing digits.
function scaledToCents(scaledDollars: bigint): number {
  return Number(
    roundDiv(scaledDollars * CENTS, PRICE_SCALE * PRICE_SCALE * PRICE_SCALE),
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
  // A quantity may be fractional — a CFD trades in lots like 1.88 — so it
  // is scaled like a price rather than taken as a whole number.
  const contracts = toScaledPrice(input.contracts);

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

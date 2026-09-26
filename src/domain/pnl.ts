import { RATE_SCALE, toScaledRate } from "./rate.ts";

export type TradeDirection = "long" | "short";

export interface PnlInput {
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  contracts: number;
  pointValue: number;
  stopPrice?: number;
  /**
   * USD per one unit of the instrument's profit currency, as the decimal
   * string `fx_rates.rate_vs_usd` stores. Omitted for an instrument that
   * settles in USD. Points × quantity × point value is in the profit currency
   * (EURJPY in yen, GER40.cash in euro); this turns it into USD before the one
   * rounding to cents.
   */
  profitRateVsUsd?: string;
}

export interface PnlResult {
  pnlCents: number;
  rMultiple: number | null;
}

// Matches numeric(13,5), the prices' scale — five decimals for forex majors
// like EURUSD 1.08453. Every price, the point value and the quantity are
// scaled to an integer at this precision so the multiplication chain below
// runs in exact BigInt arithmetic instead of compounding float error across
// three factors.
const PRICE_SCALE = BigInt(100_000);
const ZERO = BigInt(0);

/**
 * A price as the integer `numeric(13,5)` stores, so arithmetic on it is exact.
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

/**
 * Profit-currency units at PRICE_SCALE^3 as USD cents: multiplied by the rate
 * first and rounded once, so a converted P&L is rounded exactly like a USD one.
 * Mirrors `tradePnlCents` in src/db/queries/trades.ts.
 */
function convertedToCents(scaled: bigint, rateVsUsd?: string): number {
  if (rateVsUsd === undefined) return scaledToCents(scaled);
  return Number(
    roundDiv(
      scaled * toScaledRate(rateVsUsd) * CENTS,
      PRICE_SCALE * PRICE_SCALE * PRICE_SCALE * RATE_SCALE,
    ),
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

  const derivedPnlCents = convertedToCents(
    pointsCapturedScaled(input) * pointValueScaled * contracts,
    input.profitRateVsUsd,
  );
  const pnlCents = overridePnlCents ?? derivedPnlCents;

  if (input.stopPrice === undefined) {
    return { pnlCents, rMultiple: null };
  }

  const riskScaled =
    toScaledPrice(input.entryPrice) - toScaledPrice(input.stopPrice);
  const initialRiskCents = convertedToCents(
    (riskScaled < ZERO ? -riskScaled : riskScaled) *
      pointValueScaled *
      contracts,
    input.profitRateVsUsd,
  );

  if (initialRiskCents === 0) {
    return { pnlCents, rMultiple: null };
  }

  return {
    pnlCents,
    rMultiple: pnlCents / initialRiskCents,
  };
}

export interface UsdPnlInput extends Omit<PnlInput, "profitRateVsUsd"> {
  /** `USD`, or the currency points × quantity × point value is in. */
  profitCurrency: string;
  /** The stored rate for the trade date; null while none is stored. */
  profitRateVsUsd: string | null;
}

export interface UsdPnlResult {
  /** Null when the P&L is in another currency and no rate exists yet. */
  pnlCents: number | null;
  rMultiple: number | null;
}

/**
 * calculatePnl for a trade whose instrument may settle in another currency
 * (ftmo-cfd-instruments) — the one place that decides what happens without a
 * rate. A USD amount does not exist then, so `pnlCents` is null, the same
 * NULL `tradePnlCents` gives in SQL, instead of counting yen as dollars. An
 * override is USD already and still counts. R needs no rate: without an
 * override, P&L and risk share the currency and it cancels out.
 */
export function calculateUsdPnl(
  input: UsdPnlInput,
  overridePnlCents?: number,
): UsdPnlResult {
  const { profitCurrency, profitRateVsUsd, ...prices } = input;
  const foreign = profitCurrency !== "USD";
  const result = calculatePnl(
    {
      ...prices,
      profitRateVsUsd: foreign ? (profitRateVsUsd ?? undefined) : undefined,
    },
    overridePnlCents,
  );
  const unconvertible =
    foreign && profitRateVsUsd === null && overridePnlCents === undefined;
  return {
    pnlCents: unconvertible ? null : result.pnlCents,
    rMultiple: result.rMultiple,
  };
}

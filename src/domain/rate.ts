// An exchange rate as an exact integer (ftmo-cfd-instruments).
//
// Its own module because two money paths read rates: fx.ts converts account
// amounts, pnl.ts converts P&L from a profit currency. One definition of the
// scale, not two. No imports, so the trade form can use pnl.ts without
// pulling the date handling of fx.ts into the browser.

/**
 * Matches `fx_rates.rate_vs_usd`, numeric(18, 10). Ten decimals, because a
 * yen or a forint is worth well under a cent: at six, JPY would keep three
 * significant figures.
 */
export const RATE_DECIMALS = 10;
export const RATE_SCALE = BigInt(10) ** BigInt(RATE_DECIMALS);

const ZERO = BigInt(0);
const DECIMAL = /^(\d+)(?:\.(\d+))?$/;

/**
 * A positive decimal string as an integer at `RATE_SCALE`, parsed exactly —
 * rates come as strings from `numeric` columns and from the rate source, and
 * never pass through a float.
 */
export function toScaledRate(rate: string): bigint {
  const match = DECIMAL.exec(rate.trim());
  if (!match) {
    throw new RangeError(`rate must be a positive decimal, got "${rate}"`);
  }
  const [, whole, fraction = ""] = match;
  if (fraction.length > RATE_DECIMALS) {
    throw new RangeError(
      `rate has more than ${RATE_DECIMALS} decimals: "${rate}"`,
    );
  }
  const scaled = BigInt(whole + fraction.padEnd(RATE_DECIMALS, "0"));
  if (scaled === ZERO) {
    throw new RangeError(`rate must be greater than zero, got "${rate}"`);
  }
  return scaled;
}

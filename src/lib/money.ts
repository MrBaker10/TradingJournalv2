const CENTS_PER_DOLLAR = 100;

export function dollarsToCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new RangeError(`amount must be finite, got ${amount}`);
  }
  // toFixed(4) shaves off float noise from the multiplication (e.g. 1.005 * 100
  // -> 100.49999999999999) before the final rounding step.
  return Math.round(Number((amount * CENTS_PER_DOLLAR).toFixed(4)));
}

export function centsToDollars(cents: number): number {
  if (!Number.isInteger(cents)) {
    throw new RangeError(`cents must be an integer, got ${cents}`);
  }
  return cents / CENTS_PER_DOLLAR;
}

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/**
 * Display only. Trades are stored in USD and the display-currency conversion
 * is a later slice, so this formats USD and nothing else.
 *
 * `signed` puts an explicit + on a gain, which is what a P&L column wants;
 * a loss carries its own minus either way.
 */
export function formatCents(
  cents: number,
  options?: { signed?: boolean },
): string {
  const formatted = USD.format(centsToDollars(cents));
  return options?.signed && cents > 0 ? `+${formatted}` : formatted;
}

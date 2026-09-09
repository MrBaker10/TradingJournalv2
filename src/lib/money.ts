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

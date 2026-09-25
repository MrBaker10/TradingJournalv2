const CENTS_PER_DOLLAR = 100;

export function dollarsToCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new RangeError(`amount must be finite, got ${amount}`);
  }
  // toFixed(4) shaves off float noise from the multiplication (e.g. 1.005 * 100
  // -> 100.49999999999999) before the final rounding step.
  return Math.round(Number((amount * CENTS_PER_DOLLAR).toFixed(4)));
}

/**
 * An amount a user typed, as whole cents — or null when it is not one: not
 * finite, or with a third decimal that `numeric(14, 2)` would round away
 * without anyone having seen it. Unlike `dollarsToCents`, nothing is rounded.
 */
export function exactCents(amount: number): number | null {
  if (!Number.isFinite(amount)) return null;
  const scaled = amount * CENTS_PER_DOLLAR;
  const cents = Math.round(scaled);
  // A float like 0.07 * 100 lands a hair off 7; a real third decimal does not.
  return Math.abs(scaled - cents) < 1e-6 ? cents : null;
}

export function centsToDollars(cents: number): number {
  if (!Number.isInteger(cents)) {
    throw new RangeError(`cents must be an integer, got ${cents}`);
  }
  return cents / CENTS_PER_DOLLAR;
}

// One formatter per currency, built once. en-US for both: the currency sign
// changes, the digit grouping and the decimal point do not — `€1,234.56`
// beside `$1,234.56`, not a second number format on the same page.
const FORMATTERS = {
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
  EUR: new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }),
} as const;

/** The currencies an amount can be shown in (src/domain/fx.ts, ACCOUNT_CURRENCIES). */
export type DisplayCurrency = keyof typeof FORMATTERS;

/**
 * Display only. Trades are stored in USD; a page shows them in the display
 * currency of its accounts (display-currency) and passes it here. Left out,
 * the amount is USD.
 *
 * `signed` puts an explicit + on a gain, which is what a P&L column wants;
 * a loss carries its own minus either way.
 */
export function formatCents(
  cents: number,
  options?: { signed?: boolean; currency?: DisplayCurrency },
): string {
  const formatted = FORMATTERS[options?.currency ?? "USD"].format(
    centsToDollars(cents),
  );
  return options?.signed && cents > 0 ? `+${formatted}` : formatted;
}

/**
 * The same amount for a machine: `-1234.56`, no thousands separator, no
 * currency symbol, always two decimals. That is what the CSV export writes —
 * `formatCents` would put a comma inside a field and a `$` in front of a
 * number nothing can parse back.
 *
 * Built by splitting the integer cents, never by dividing into a float and
 * formatting that.
 */
export function formatCentsPlain(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new RangeError(`cents must be an integer, got ${cents}`);
  }
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  const dollars = Math.trunc(absolute / CENTS_PER_DOLLAR);
  const remainder = absolute % CENTS_PER_DOLLAR;
  return `${sign}${dollars}.${String(remainder).padStart(2, "0")}`;
}

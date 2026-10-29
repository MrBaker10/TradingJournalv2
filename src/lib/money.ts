import type { AccountCurrency, ProfitCurrency } from "../domain/fx.ts";
import {
  DEFAULT_LANGUAGE,
  INTL_LOCALES,
  type Language,
} from "./i18n/languages.ts";
import { decimalSeparator } from "./numbers.ts";

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

// One formatter per language and currency, built on first use and kept. The
// interface language decides the number format, the currency only its sign:
// `€1,234.56` beside `$1,234.56` in English, `1.234,56 €` beside `1.234,56 $`
// in German, never two number formats on the same page. Each currency keeps
// its own minor units: yen shows no decimals.
const FORMATTERS = new Map<string, Intl.NumberFormat>();

function formatterFor(
  currency: MoneyCurrency,
  language: Language,
): Intl.NumberFormat {
  const key = `${language}:${currency}`;
  let formatter = FORMATTERS.get(key);
  if (formatter === undefined) {
    formatter = new Intl.NumberFormat(INTL_LOCALES[language], {
      style: "currency",
      currency,
    });
    FORMATTERS.set(key, formatter);
  }
  return formatter;
}

/** The currencies an amount can be shown in (src/domain/fx.ts, ACCOUNT_CURRENCIES). */
export type DisplayCurrency = AccountCurrency;

/**
 * Any currency an amount can be in: an account currency, or the profit
 * currency of an instrument — the trade form shows a live P&L in it before a
 * rate is known (ftmo-cfd-instruments).
 */
export type MoneyCurrency = AccountCurrency | ProfitCurrency;

/**
 * Display only. Trades are stored in USD; a page shows them in the display
 * currency of its accounts (display-currency) and passes it here. Left out,
 * the amount is USD.
 *
 * `signed` puts an explicit + on a gain, which is what a P&L column wants;
 * a loss carries its own minus either way. `language` is the interface
 * language; left out, English.
 */
export function formatCents(
  cents: number,
  options?: {
    signed?: boolean;
    currency?: MoneyCurrency;
    language?: Language;
  },
): string {
  const formatted = formatterFor(
    options?.currency ?? "USD",
    options?.language ?? DEFAULT_LANGUAGE,
  ).format(centsToDollars(cents));
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

/**
 * A signed amount small enough for a phone's calendar day: `+142`, `-1.6k`.
 * Whole units, thousands with one truncated decimal, no currency symbol; the
 * full amount stays in the day's label. Built from the integer cents by
 * division and remainder, never through a float. German writes `-1,6k`.
 */
export function formatCentsCompact(
  cents: number,
  language: Language = DEFAULT_LANGUAGE,
): string {
  if (!Number.isInteger(cents)) {
    throw new RangeError(`cents must be an integer, got ${cents}`);
  }
  const units = Math.trunc(Math.abs(cents) / CENTS_PER_DOLLAR);
  if (units === 0) return "0";
  const sign = cents < 0 ? "-" : "+";
  if (units < 1000) return `${sign}${units}`;
  const thousands = Math.trunc(units / 1000);
  const tenths = Math.trunc((units % 1000) / 100);
  return `${sign}${thousands}${decimalSeparator(language)}${tenths}k`;
}

const CENTS_PER_THOUSAND_DOLLARS = 100_000;

/**
 * An amount the way traders name an account size: `50k`, `7.5k` (German
 * `7,5k`). Built from the integer cents by division and remainder digits,
 * never through a float.
 */
export function formatCentsThousands(
  cents: number,
  language: Language = DEFAULT_LANGUAGE,
): string {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new RangeError(`cents must be a non-negative integer, got ${cents}`);
  }
  const thousands = Math.trunc(cents / CENTS_PER_THOUSAND_DOLLARS);
  const remainder = cents % CENTS_PER_THOUSAND_DOLLARS;
  if (remainder === 0) return `${thousands}k`;
  const decimals = String(remainder).padStart(5, "0").replace(/0+$/, "");
  return `${thousands}${decimalSeparator(language)}${decimals}k`;
}

// Exchange rates for account currencies.
//
// Trades are stored in USD (project-overview.md, Currency). An account kept in
// another currency — an FTMO account in EUR — reports its P&L in that
// currency, and the amount is converted exactly once, with the ECB reference
// rate of the trade date, before it is written.
//
// Rates come in as decimal strings, the way `numeric` columns and the rate
// source deliver them, and are never parsed into a float: the conversion runs
// in BigInt like the rest of the money path (coding-standards.md, Money).

import { TZDate } from "@date-fns/tz";
import { addDays, format } from "date-fns";
import type { IsoDate } from "./streak.ts";

export const ACCOUNT_CURRENCIES = ["USD", "EUR"] as const;
export type AccountCurrency = (typeof ACCOUNT_CURRENCIES)[number];

/** A currency other than USD — the only kind that has a rate. */
export type ForeignCurrency = Exclude<AccountCurrency, "USD">;

/** One stored rate: how many USD one unit of the currency buys on that date. */
export interface FxRate {
  /** `YYYY-MM-DD`. */
  date: string;
  /** Decimal string, e.g. `1.146`. */
  rateVsUsd: string;
}

/**
 * How far back a missing day may borrow a rate. The ECB publishes on TARGET
 * business days only; the longest gap is the Easter weekend, four days.
 */
export const MAX_RATE_LOOKBACK_DAYS = 7;

/** Matches `fx_rates.rate_vs_usd`, numeric(12, 6). */
const RATE_DECIMALS = 6;
const RATE_SCALE = BigInt(10) ** BigInt(RATE_DECIMALS);
const ZERO = BigInt(0);
const TWO = BigInt(2);

const DECIMAL = /^(\d+)(?:\.(\d+))?$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A positive decimal string as an integer at `RATE_SCALE`, parsed exactly. */
function toScaledRate(rate: string): bigint {
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

/**
 * An amount in the account currency, in integer minor units, as USD cents.
 * Rounds half away from zero, so a loss and a gain of the same size convert
 * to the same magnitude.
 */
export function toUsdCents(cents: number, rateVsUsd: string): number {
  if (!Number.isInteger(cents)) {
    throw new RangeError(`cents must be an integer, got ${cents}`);
  }
  const product = BigInt(cents) * toScaledRate(rateVsUsd);
  const magnitude = product < ZERO ? -product : product;
  const rounded = (magnitude * TWO + RATE_SCALE) / (RATE_SCALE * TWO);
  return Number(product < ZERO ? -rounded : rounded);
}

function assertIsoDate(date: IsoDate): void {
  if (!ISO_DATE.test(date)) {
    throw new RangeError(`date must be YYYY-MM-DD, got "${date}"`);
  }
}

/** A calendar date shifted by whole days, UTC-anchored like streak.ts. */
export function shiftDate(date: IsoDate, days: number): IsoDate {
  assertIsoDate(date);
  return format(
    addDays(new TZDate(`${date}T00:00:00Z`, "UTC"), days),
    "yyyy-MM-dd",
  );
}

/**
 * The stored rate that applies on `date`: that day's, or the last one
 * published before it within `MAX_RATE_LOOKBACK_DAYS`, with its own date.
 */
export function applicableRate(date: string, rates: FxRate[]): FxRate | null {
  assertIsoDate(date);
  const earliest = shiftDate(date, -MAX_RATE_LOOKBACK_DAYS);
  let best: FxRate | null = null;
  for (const rate of rates) {
    if (rate.date > date || rate.date < earliest) continue;
    if (best === null || rate.date > best.date) best = rate;
  }
  return best;
}

/**
 * The rate that applies on `date`: that day's, or the last one published
 * before it within `MAX_RATE_LOOKBACK_DAYS`. A Saturday takes Friday's rate.
 * Null when nothing is close enough — the caller has to fetch, not guess.
 */
export function rateFor(date: string, rates: FxRate[]): string | null {
  return applicableRate(date, rates)?.rateVsUsd ?? null;
}

/**
 * The dates whose rate the stored set cannot settle yet.
 *
 * A date is settled when `rateFor` finds a rate for it **and** some rate is
 * stored on or after it. The second half matters: with Friday stored and
 * Monday asked for, `rateFor` would happily return Friday's rate — but only
 * because Monday's has not been fetched, not because the ECB skipped Monday.
 * A later stored rate proves the fetch already covered the day, so a gap
 * before it is a real non-publishing day.
 */
export function datesNeedingFetch(
  dates: string[],
  storedDates: string[],
): string[] {
  const stored = storedDates.map((date) => ({ date, rateVsUsd: "1" }));
  const latest = storedDates.reduce<string | null>(
    (max, date) => (max === null || date > max ? date : max),
    null,
  );
  const needed = new Set<string>();
  for (const date of dates) {
    const covered =
      latest !== null && latest >= date && rateFor(date, stored) !== null;
    if (!covered) needed.add(date);
  }
  return [...needed].sort();
}

/**
 * The rate `date` will keep for good, or null while that is not known yet.
 *
 * Final means the same as settled in `datesNeedingFetch`: a rate is stored on
 * or after the date, so any gap before it is a day the ECB did not publish.
 * Until then the applicable rate is only the latest one there happens to be.
 */
export function finalRateFor(date: string, rates: FxRate[]): FxRate | null {
  assertIsoDate(date);
  if (!rates.some((rate) => rate.date >= date)) return null;
  return applicableRate(date, rates);
}

/**
 * Whether a converted amount still waits for its final rate.
 *
 * An import before the ECB publishes (around 16:00 CET) converts with the
 * last rate there is and records that rate's date. The amount is provisional
 * until `finalRateFor` settles on that same date: a Saturday trade on Friday's
 * rate is final once Monday's rate is stored, a Thursday trade on Wednesday's
 * rate waits for Thursday's. The nightly `job:fx` converts the rest again.
 * A trade with no rate date was never converted, or its P&L was edited by
 * hand — either way nothing is pending.
 */
export function isProvisional(
  fxRateDate: string | null,
  tradeDate: string,
  rates: FxRate[],
): boolean {
  if (fxRateDate === null) return false;
  assertIsoDate(fxRateDate);
  return finalRateFor(tradeDate, rates)?.date !== fxRateDate;
}

/** An amount converted for a trade: the USD cents and the rate it took. */
export interface UsdConversion {
  usdCents: number;
  /** The date of the rate used — `trades.fx_rate_date`. */
  rateDate: string;
  provisional: boolean;
}

/**
 * An import's conversion: the rate that applies on the trade date now, even
 * if it is only provisional. Null when no rate is close enough — the caller
 * reports that instead of writing an unconverted amount.
 */
export function convertForTrade(
  cents: number,
  tradeDate: string,
  rates: FxRate[],
): UsdConversion | null {
  const rate = applicableRate(tradeDate, rates);
  if (rate === null) return null;
  return {
    usdCents: toUsdCents(cents, rate.rateVsUsd),
    rateDate: rate.date,
    provisional: isProvisional(rate.date, tradeDate, rates),
  };
}

/**
 * The nightly correction for one provisional trade: its amount on the final
 * rate, or null while there is none yet or the trade already has it.
 */
export function correctionFor(
  cents: number,
  fxRateDate: string,
  tradeDate: string,
  rates: FxRate[],
): Omit<UsdConversion, "provisional"> | null {
  const final = finalRateFor(tradeDate, rates);
  if (final === null || final.date === fxRateDate) return null;
  return {
    usdCents: toUsdCents(cents, final.rateVsUsd),
    rateDate: final.date,
  };
}

/**
 * The currency figures are shown in (decided 2026-09-24, display-currency):
 * the one currency every account in scope shares, else USD. A selected
 * account passes just its own. No account at all is USD — the currency
 * trades are stored in.
 */
export function displayCurrencyFor(
  currencies: AccountCurrency[],
): AccountCurrency {
  const [first] = currencies;
  if (first === undefined) return "USD";
  return currencies.every((currency) => currency === first) ? first : "USD";
}

/**
 * USD cents back into the account currency, in integer minor units: the
 * inverse of `toUsdCents`, for display only. Rounds half away from zero like
 * `toUsdCents` and like `round()` on `numeric` in SQL, which is what the
 * display query does (`tradeDisplayCents`, src/db/queries/trades.ts).
 */
export function toAccountCents(usdCents: number, rateVsUsd: string): number {
  if (!Number.isInteger(usdCents)) {
    throw new RangeError(`usdCents must be an integer, got ${usdCents}`);
  }
  const rate = toScaledRate(rateVsUsd);
  const numerator = BigInt(usdCents) * RATE_SCALE;
  const magnitude = numerator < ZERO ? -numerator : numerator;
  const rounded = (magnitude * TWO + rate) / (rate * TWO);
  return Number(numerator < ZERO ? -rounded : rounded);
}

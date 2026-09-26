// ECB reference rates from frankfurter (project-overview.md, FX rates).
//
// The address is fixed; nothing a user types ever reaches it. Fetching and
// parsing are separate so the parser is testable without a network.
//
// `providers=ecb` is not optional. Without it the v2 API blends 98 sources and
// returns a value for every calendar day, weekends included — a different
// number from the ECB reference rate the project specifies (decisions.md).
// The base is always EUR, the ECB's own quoting currency: frankfurter's cross
// rates for another base are rounded to five significant figures.

import {
  crossRateVsUsd,
  type FxRate,
  type RateCurrency,
} from "../../domain/fx.ts";

const ENDPOINT = "https://api.frankfurter.dev/v2/rates";
const TIMEOUT_MS = 10_000;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The response body as an `FxRate` list, or a thrown error. Anything that is
 * not exactly the expected shape throws — a rate silently read from the wrong
 * field would be converted into every imported trade.
 *
 * The body is always the ECB's own table, quoted per euro. EUR takes the USD
 * quote as it is; any other currency is crossed through the euro with
 * `crossRateVsUsd`, so a date must carry both quotes.
 */
export function parseRates(body: unknown, currency: RateCurrency): FxRate[] {
  if (!Array.isArray(body)) {
    throw new Error("Unexpected rate response: not a list");
  }
  const byDate = new Map<string, { usd?: string; other?: string }>();
  body.forEach((row, index) => {
    const { date, base, quote, rate } = (row ?? {}) as Record<string, unknown>;
    if (
      typeof date !== "string" ||
      !ISO_DATE.test(date) ||
      base !== "EUR" ||
      (quote !== "USD" && (currency === "EUR" || quote !== currency)) ||
      typeof rate !== "number" ||
      !Number.isFinite(rate) ||
      rate <= 0
    ) {
      throw new Error(`Unexpected rate response at row ${index + 1}`);
    }
    // The JSON number carries the ECB's own four to six significant figures;
    // String() keeps them as written, and fx.ts parses them exactly.
    const day = byDate.get(date) ?? {};
    if (quote === "USD") day.usd = String(rate);
    else day.other = String(rate);
    byDate.set(date, day);
  });

  return [...byDate.entries()].map(([date, { usd, other }]) => {
    if (usd === undefined || (currency !== "EUR" && other === undefined)) {
      throw new Error(`Unexpected rate response: ${date} lacks a quote`);
    }
    return {
      date,
      rateVsUsd:
        currency === "EUR" || other === undefined
          ? usd
          : crossRateVsUsd(usd, other),
    };
  });
}

/** ECB rates for `currency` in USD, for every publishing day in the range. */
export async function fetchEcbRates(
  currency: RateCurrency,
  from: string,
  to: string,
): Promise<FxRate[]> {
  const url = new URL(ENDPOINT);
  url.searchParams.set("base", "EUR");
  url.searchParams.set(
    "quotes",
    currency === "EUR" ? "USD" : `USD,${currency}`,
  );
  url.searchParams.set("providers", "ecb");
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);

  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Exchange rates unavailable (HTTP ${response.status})`);
  }
  return parseRates(await response.json(), currency);
}

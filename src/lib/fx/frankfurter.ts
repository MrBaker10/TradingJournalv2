// ECB reference rates from frankfurter (project-overview.md, FX rates).
//
// The address is fixed; nothing a user types ever reaches it. Fetching and
// parsing are separate so the parser is testable without a network.
//
// `providers=ecb` is not optional. Without it the v2 API blends 98 sources and
// returns a value for every calendar day, weekends included — a different
// number from the ECB reference rate the project specifies (decisions.md).

import type { ForeignCurrency, FxRate } from "../../domain/fx.ts";

const ENDPOINT = "https://api.frankfurter.dev/v2/rates";
const TIMEOUT_MS = 10_000;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The response body as an `FxRate` list, or a thrown error. Anything that is
 * not exactly the expected shape throws — a rate silently read from the wrong
 * field would be converted into every imported trade.
 */
export function parseRates(body: unknown, currency: ForeignCurrency): FxRate[] {
  if (!Array.isArray(body)) {
    throw new Error("Unexpected rate response: not a list");
  }
  return body.map((row, index) => {
    const { date, base, quote, rate } = (row ?? {}) as Record<string, unknown>;
    if (
      typeof date !== "string" ||
      !ISO_DATE.test(date) ||
      base !== currency ||
      quote !== "USD" ||
      typeof rate !== "number" ||
      !Number.isFinite(rate) ||
      rate <= 0
    ) {
      throw new Error(`Unexpected rate response at row ${index + 1}`);
    }
    // The JSON number carries at most the source's four or five decimals;
    // String() keeps them as written, and fx.ts rejects anything beyond six.
    return { date, rateVsUsd: String(rate) };
  });
}

/** ECB rates for `currency` in USD, for every publishing day in the range. */
export async function fetchEcbRates(
  currency: ForeignCurrency,
  from: string,
  to: string,
): Promise<FxRate[]> {
  const url = new URL(ENDPOINT);
  url.searchParams.set("base", currency);
  url.searchParams.set("quotes", "USD");
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

// Converting amounts in a foreign account currency into USD, for a request.
//
// The one path an import and an account's starting balance share: fetch the
// ECB rates the dates need (`ensureFxRates`, only what is missing), then
// convert each amount with the rate that applies on its date
// (`convertForTrade`). Callers word the failure themselves — an import names
// the line, a balance says nothing was saved — so a failure comes back as a
// reason, not as a message.
//
// Relative imports, like job.ts: plain node can resolve them.

import { db } from "../../db/index.ts";
import {
  ensureFxRates,
  type FxExecutor,
  type RateFetcher,
} from "../../db/queries/fx.ts";
import {
  convertForTrade,
  type ForeignCurrency,
  type UsdConversion,
} from "../../domain/fx.ts";
import { fetchEcbRates } from "./frankfurter.ts";

/** One amount in the account currency, and the date whose rate applies. */
export interface ForeignAmount {
  cents: number;
  date: string;
}

export type UsdConversionResult =
  | { ok: true; conversions: UsdConversion[] }
  /** The rate source or its store failed; nothing is known about the rates. */
  | { ok: false; reason: "unavailable" }
  /** No rate close enough to `date`; `index` is the amount it stopped at. */
  | { ok: false; reason: "no-rate"; index: number; date: string };

export async function convertToUsd(
  currency: ForeignCurrency,
  amounts: ForeignAmount[],
  fetcher: RateFetcher = fetchEcbRates,
  executor: FxExecutor = db,
): Promise<UsdConversionResult> {
  if (amounts.length === 0) return { ok: true, conversions: [] };

  let rates: Awaited<ReturnType<typeof ensureFxRates>>;
  try {
    rates = await ensureFxRates(
      currency,
      [...new Set(amounts.map((amount) => amount.date))],
      fetcher,
      executor,
    );
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  const conversions: UsdConversion[] = [];
  for (const [index, amount] of amounts.entries()) {
    const converted = convertForTrade(amount.cents, amount.date, rates);
    if (converted === null) {
      return { ok: false, reason: "no-rate", index, date: amount.date };
    }
    conversions.push(converted);
  }
  return { ok: true, conversions };
}

// job:fx — the nightly correction of provisional FX conversions.
//
// An import before the ECB publishes (around 16:00 CET) converts a foreign
// account's P&L with the latest rate there is and marks it with that rate's
// date. This job fetches what has been published since and converts each such
// trade again with its final rate (src/domain/fx.ts, correctionFor). A hand
// edit of the P&L wins: it clears the mark, and the trade drops out.
//
// The same handler runs from `pnpm job:fx` and from the Vercel Cron route
// (/api/cron/fx), so it uses relative imports that plain node can resolve.

import { db } from "../../db/index.ts";
import {
  applyFxCorrections,
  type ConvertedTrade,
  ensureFxRates,
  type FxCorrection,
  type FxExecutor,
  listConvertedTrades,
  listTradeDatesOnCurrency,
  type RateFetcher,
} from "../../db/queries/fx.ts";
import {
  ACCOUNT_CURRENCIES,
  correctionFor,
  type ForeignCurrency,
} from "../../domain/fx.ts";
import { dollarsToCents } from "../money.ts";
import { fetchEcbRates } from "./frankfurter.ts";

/** Every currency that is not USD — the ones that have a rate. */
const FOREIGN_CURRENCIES = ACCOUNT_CURRENCIES.filter(
  (currency): currency is ForeignCurrency => currency !== "USD",
);

export interface FxJobResult {
  /** Trades converted with a rate from before their own date. */
  checked: number;
  /** Of those, how many were converted again. */
  corrected: number;
}

export async function runFxJob(
  fetcher: RateFetcher = fetchEcbRates,
  executor: FxExecutor & Pick<typeof db, "execute"> = db,
): Promise<FxJobResult> {
  const converted = await listConvertedTrades(executor);

  const byCurrency = new Map<ForeignCurrency, ConvertedTrade[]>();
  for (const trade of converted) {
    const group = byCurrency.get(trade.currency) ?? [];
    group.push(trade);
    byCurrency.set(trade.currency, group);
  }

  const corrections: FxCorrection[] = [];
  for (const [currency, trades] of byCurrency) {
    const rates = await ensureFxRates(
      currency,
      [...new Set(trades.map((trade) => trade.tradeDate))],
      fetcher,
      executor,
    );

    for (const trade of trades) {
      const correction = correctionFor(
        dollarsToCents(Number(trade.pnlSource)),
        trade.fxRateDate,
        trade.tradeDate,
        rates,
      );
      if (correction === null) continue;
      corrections.push({
        tradeId: trade.id,
        fromRateDate: trade.fxRateDate,
        toRateDate: correction.rateDate,
        usdCents: correction.usdCents,
      });
    }
  }

  const corrected = await applyFxCorrections(corrections, executor);

  // Display in an account currency needs the rate of every trade date on such
  // an account (display-currency). Saving a trade already asks for its own;
  // this fills what that missed — the ECB was down, or the trade predates the
  // slice. `ensureFxRates` fetches only what the table cannot settle.
  for (const currency of FOREIGN_CURRENCIES) {
    const dates = await listTradeDatesOnCurrency(currency, executor);
    if (dates.length > 0) {
      await ensureFxRates(currency, dates, fetcher, executor);
    }
  }

  return { checked: converted.length, corrected };
}

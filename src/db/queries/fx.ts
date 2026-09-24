import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import {
  datesNeedingFetch,
  type ForeignCurrency,
  type FxRate,
  MAX_RATE_LOOKBACK_DAYS,
  shiftDate,
} from "../../domain/fx.ts";
import { db } from "../index.ts";
import { fxRates } from "../schema/fx-rates.ts";

/** Anything that can read and upsert: `db`, or a transaction in a test. */
export type FxExecutor = Pick<typeof db, "select" | "insert">;

/** Where missing rates come from. The import passes `fetchEcbRates`. */
export type RateFetcher = (
  currency: ForeignCurrency,
  from: string,
  to: string,
) => Promise<FxRate[]>;

async function listStoredRates(
  executor: FxExecutor,
  currency: ForeignCurrency,
  from: string,
  to: string,
): Promise<FxRate[]> {
  return executor
    .select({ date: fxRates.rateDate, rateVsUsd: fxRates.rateVsUsd })
    .from(fxRates)
    .where(
      and(
        eq(fxRates.currency, currency),
        gte(fxRates.rateDate, from),
        lte(fxRates.rateDate, to),
      ),
    )
    .orderBy(asc(fxRates.rateDate));
}

/**
 * The stored rates that cover `dates`, after fetching whatever the table
 * cannot settle yet (src/domain/fx.ts, `datesNeedingFetch`).
 *
 * One fetch at most: the window runs from the lookback before the earliest
 * missing date to the latest one, so a Monday also brings the Friday it may
 * need. Rows are upserted, which keeps a repeated or concurrent call harmless
 * and lets a later fetch correct a rate the source revised.
 *
 * The returned list is what `rateFor` reads; a date it still cannot answer
 * after the fetch has no ECB rate, and the caller says so.
 */
export async function ensureFxRates(
  currency: ForeignCurrency,
  dates: string[],
  fetcher: RateFetcher,
  executor: FxExecutor = db,
): Promise<FxRate[]> {
  if (dates.length === 0) return [];

  const sorted = [...dates].sort();
  const windowFrom = shiftDate(sorted[0], -MAX_RATE_LOOKBACK_DAYS);
  // A later stored rate is what proves a date settled, so the read reaches
  // past the last date by the same margin.
  const windowTo = shiftDate(sorted[sorted.length - 1], MAX_RATE_LOOKBACK_DAYS);

  const stored = await listStoredRates(
    executor,
    currency,
    windowFrom,
    windowTo,
  );
  const missing = datesNeedingFetch(
    sorted,
    stored.map((rate) => rate.date),
  );
  if (missing.length === 0) return stored;

  const fetched = await fetcher(
    currency,
    shiftDate(missing[0], -MAX_RATE_LOOKBACK_DAYS),
    missing[missing.length - 1],
  );
  if (fetched.length > 0) {
    await executor
      .insert(fxRates)
      .values(
        fetched.map((rate) => ({
          currency,
          rateDate: rate.date,
          rateVsUsd: rate.rateVsUsd,
        })),
      )
      .onConflictDoUpdate({
        target: [fxRates.currency, fxRates.rateDate],
        set: { rateVsUsd: sql`excluded.rate_vs_usd` },
      });
  }

  return listStoredRates(executor, currency, windowFrom, windowTo);
}

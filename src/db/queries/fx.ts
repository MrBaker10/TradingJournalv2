import { and, asc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import {
  type AccountCurrency,
  datesNeedingFetch,
  type ForeignCurrency,
  type FxRate,
  isProvisional,
  MAX_RATE_LOOKBACK_DAYS,
  shiftDate,
} from "../../domain/fx.ts";
import { formatCentsPlain } from "../../lib/money.ts";
import { db } from "../index.ts";
import { accounts } from "../schema/accounts.ts";
import { fxRates } from "../schema/fx-rates.ts";
import { toNumber } from "./scope.ts";

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

/** One imported trade whose P&L was converted with a rate from an earlier day. */
export interface ConvertedTrade {
  id: number;
  tradeDate: string;
  fxRateDate: string;
  /** `pnl_source` as stored, e.g. `56.76`, in the account's currency. */
  pnlSource: string;
  currency: ForeignCurrency;
}

/**
 * Every trade job:fx may have to convert again: an import's P&L on a foreign
 * account, converted with a rate dated before the trade. Most of these are
 * already final — a weekend trade keeps Friday's rate for good — and the job
 * sorts that out against the stored rates (src/domain/fx.ts, correctionFor).
 *
 * The currency is the import target's, from the batch, not from whatever the
 * trade has been assigned to since: it is the currency the file was in.
 * A hand-edited P&L has no `pnl_source` left and never shows up here.
 *
 * Runs across users — it is the nightly job, not a request — and reads only
 * what the conversion needs.
 */
export async function listConvertedTrades(
  executor: Pick<typeof db, "execute"> = db,
): Promise<ConvertedTrade[]> {
  const rows = await executor.execute<{
    id: number;
    trade_date: string;
    fx_rate_date: string;
    pnl_source: string;
    currency: Exclude<AccountCurrency, "USD">;
  }>(sql`
    select t.id, t.trade_date, t.fx_rate_date, t.pnl_source, a.currency
    from trades t
    join import_batches b on b.id = t.import_batch_id
    join accounts a on a.id = b.account_id
    where t.fx_rate_date is not null
      and t.pnl_source is not null
      and t.fx_rate_date < t.trade_date
      and a.currency <> 'USD'
    order by t.id
  `);

  return [...rows].map((row) => ({
    id: toNumber(row.id),
    tradeDate: row.trade_date,
    fxRateDate: row.fx_rate_date,
    pnlSource: row.pnl_source,
    currency: row.currency,
  }));
}

/** A provisional amount replaced by its final one. */
export interface FxCorrection {
  tradeId: number;
  /** The rate date the trade had when it was read — the guard below. */
  fromRateDate: string;
  toRateDate: string;
  usdCents: number;
}

/**
 * Writes every correction in one statement.
 *
 * The guard is in the `where`: a trade whose rate date changed since it was
 * read, or whose P&L was edited by hand in between (`pnl_source` cleared), is
 * left alone. Returns how many trades were written.
 */
export async function applyFxCorrections(
  corrections: FxCorrection[],
  executor: Pick<typeof db, "execute"> = db,
): Promise<number> {
  if (corrections.length === 0) return 0;

  // Casts on every tuple, as in updateImportedTrades: a list's types would
  // otherwise be inferred from its first row alone.
  const tuples = sql.join(
    corrections.map(
      (correction) =>
        sql`(${correction.tradeId}::integer, ${correction.fromRateDate}::date, ${correction.toRateDate}::date, ${formatCentsPlain(correction.usdCents)}::numeric(14,2))`,
    ),
    sql`, `,
  );

  const rows = await executor.execute<{ id: number }>(sql`
    update trades t
    set pnl_override = v.pnl_override,
        fx_rate_date = v.to_date,
        updated_at = now()
    from (values ${tuples}) as v(id, from_date, to_date, pnl_override)
    where t.id = v.id
      and t.fx_rate_date = v.from_date
      and t.pnl_source is not null
    returning t.id
  `);

  return [...rows].length;
}

/**
 * Whether one trade's converted P&L is still on a provisional rate — the
 * hint on the detail page. False for a trade that was never converted.
 * Ownership is in the `where`, like every read behind a session.
 */
export async function isTradeFxProvisional(
  userId: number,
  tradeId: number,
): Promise<boolean> {
  const rows = await db.execute<{
    trade_date: string;
    fx_rate_date: string;
    currency: Exclude<AccountCurrency, "USD">;
  }>(sql`
    select t.trade_date, t.fx_rate_date, a.currency
    from trades t
    join import_batches b on b.id = t.import_batch_id
    join accounts a on a.id = b.account_id
    where t.id = ${tradeId}
      and t.user_id = ${userId}
      and t.fx_rate_date is not null
      and t.pnl_source is not null
      and a.currency <> 'USD'
  `);
  const [row] = [...rows];
  if (row === undefined) return false;

  const rates = await listStoredRates(
    db,
    row.currency,
    shiftDate(row.trade_date, -MAX_RATE_LOOKBACK_DAYS),
    shiftDate(row.trade_date, MAX_RATE_LOOKBACK_DAYS),
  );
  return isProvisional(row.fx_rate_date, row.trade_date, rates);
}

/**
 * The trade dates on accounts kept in `currency`, for which a display
 * conversion needs a rate (display-currency). `ensureFxRates` decides which of
 * them are missing; this only lists them. Runs across users — it is job:fx.
 */
export async function listTradeDatesOnCurrency(
  currency: ForeignCurrency,
  executor: Pick<typeof db, "execute"> = db,
): Promise<string[]> {
  const rows = await executor.execute<{ trade_date: string }>(sql`
    select distinct t.trade_date
    from trades t
    join trade_accounts ta on ta.trade_id = t.id
    join accounts a on a.id = ta.account_id
    where a.currency = ${currency}
    order by t.trade_date
  `);
  return [...rows].map((row) => row.trade_date);
}

/**
 * The foreign currencies among some of the user's accounts — the ones a trade
 * assigned to them needs rates for. Filtered by the user.
 */
export async function listForeignCurrencies(
  userId: number,
  accountIds: number[],
  executor: Pick<typeof db, "selectDistinct"> = db,
): Promise<ForeignCurrency[]> {
  if (accountIds.length === 0) return [];
  const rows = await executor
    .selectDistinct({ currency: accounts.currency })
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, userId),
        inArray(accounts.id, accountIds),
        ne(accounts.currency, "USD"),
      ),
    );
  return rows
    .map((row) => row.currency)
    .filter((currency): currency is ForeignCurrency => currency !== "USD");
}

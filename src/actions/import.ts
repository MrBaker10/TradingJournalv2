"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/index";
import { findImportAccount } from "@/db/queries/accounts";
import { ensureFxRates, storedRatesOn } from "@/db/queries/fx";
import {
  createImportBatch,
  type ImportedTrade,
  insertImportedTrades,
  listMatchCandidates,
  removeUntouchedTrades,
  type TradeUpdate,
  updateImportedTrades,
} from "@/db/queries/import";
import { listInstruments } from "@/db/queries/instruments";
import {
  type AccountCurrency,
  isRateCurrency,
  type RateCurrency,
} from "@/domain/fx";
import { matchRows } from "@/domain/import/match";
import {
  decideOutcome,
  derivePoints,
  deriveResult,
} from "@/domain/import/outcome";
import { sessionFromEntryTime } from "@/domain/import/session";
import type { NormalizedTrade } from "@/domain/import/types";
import { calculateUsdPnl } from "@/domain/pnl";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { awardBadgesQuietly } from "@/lib/badges/sync";
import { convertToUsd } from "@/lib/fx/convert";
import { fetchEcbRates } from "@/lib/fx/frankfurter";
import {
  commitImportSchema,
  previewImportSchema,
  undoImportSchema,
} from "@/schemas/import";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type RowVerdict = "new" | "update" | "skip";

export interface PreviewRow {
  sourceRow: number;
  verdict: RowVerdict;
  /** Plain English, shown next to the row in the preview table. */
  reason: string;
  /** The file's own P&L in the account's currency, as the file reports it. */
  filePnlCents: number | null;
  /** What the journal will store for it, in USD; null without a file P&L. */
  pnlUsdCents: number | null;
  /** The P&L the prices give, in USD, next to the file's for comparison. */
  computedPnlCents: number | null;
  /** The date of the ECB rate used, when the amount was converted. */
  fxRateDate: string | null;
  /** Converted before the day's rate was published; corrected overnight. */
  provisional: boolean;
}

export interface ImportCounters {
  new: number;
  update: number;
  skip: number;
}

export interface ImportPreview {
  rows: PreviewRow[];
  counters: ImportCounters;
  /** The currency the target account's file amounts are in. */
  currency: AccountCurrency;
}

/**
 * What an import writes for a row's own P&L (project-overview.md, Currency):
 * the file amount in the account's currency as `pnl_source`, and that amount
 * in USD as `pnl_override`, converted once with the ECB rate of the trade date.
 */
interface RowPnl {
  sourceCents: number;
  usdCents: number;
  /** Null on a USD account: nothing was converted. */
  fxRateDate: string | null;
  provisional: boolean;
}

type ConvertedRows =
  | { ok: true; pnl: (RowPnl | null)[] }
  | { ok: false; error: string };

/**
 * Converts every file P&L of a batch. Missing rates are fetched first
 * (`ensureFxRates`); before the ECB publishes, a day borrows the latest rate
 * and the row is provisional until job:fx converts it again.
 */
async function convertRows(
  rows: NormalizedTrade[],
  currency: AccountCurrency,
): Promise<ConvertedRows> {
  if (currency === "USD") {
    return {
      ok: true,
      pnl: rows.map((row) =>
        row.filePnlCents === null
          ? null
          : {
              sourceCents: row.filePnlCents,
              usdCents: row.filePnlCents,
              fxRateDate: null,
              provisional: false,
            },
      ),
    };
  }

  // Only rows the file gives a P&L for are converted; the rest stay null.
  const withPnl = rows.flatMap((row, index) =>
    row.filePnlCents === null
      ? []
      : [{ index, cents: row.filePnlCents, date: row.tradeDate }],
  );
  const result = await convertToUsd(currency, withPnl);
  if (!result.ok) {
    // The rate source or its store failed, not the journal: said as such, so
    // the user retries later instead of suspecting their data.
    return {
      ok: false,
      error:
        result.reason === "unavailable"
          ? `Couldn't fetch the ECB rates to convert ${currency} to USD. Nothing was imported — try again in a moment.`
          : `There is no ECB rate for ${currency} on ${result.date}, so line ${rows[withPnl[result.index].index].sourceRow} cannot be converted to USD.`,
    };
  }

  const pnl: (RowPnl | null)[] = rows.map(() => null);
  for (const [position, item] of withPnl.entries()) {
    const converted = result.conversions[position];
    pnl[item.index] = {
      sourceCents: item.cents,
      usdCents: converted.usdCents,
      fxRateDate: converted.rateDate,
      provisional: converted.provisional,
    };
  }
  return { ok: true, pnl };
}

/**
 * The P&L the prices give, per row, for the preview's comparison column —
 * converted from the instrument's profit currency with the trade date's rate
 * like every other P&L from prices (ftmo-cfd-instruments). Null where there
 * is no exit, or no rate for a foreign profit currency.
 */
async function computePnl(rows: NormalizedTrade[]): Promise<(number | null)[]> {
  const instrumentsById = new Map(
    (await listInstruments()).map((instrument) => [instrument.id, instrument]),
  );

  // The trade dates per foreign profit currency, so each currency costs one
  // fetch at most and one query — not one of each per row.
  const datesByCurrency = new Map<RateCurrency, string[]>();
  for (const row of rows) {
    const currency = instrumentsById.get(row.instrumentId)?.profitCurrency;
    if (currency === undefined || !isRateCurrency(currency)) continue;
    const dates = datesByCurrency.get(currency) ?? [];
    dates.push(row.tradeDate);
    datesByCurrency.set(currency, dates);
  }
  const ratesByCurrency = new Map<RateCurrency, Map<string, string | null>>();
  for (const [currency, dates] of datesByCurrency) {
    try {
      await ensureFxRates(currency, dates, fetchEcbRates);
    } catch (error) {
      console.error("computePnl: rates not stored", error);
    }
    ratesByCurrency.set(currency, await storedRatesOn(currency, dates));
  }

  return rows.map((row) => {
    const instrument = instrumentsById.get(row.instrumentId);
    if (row.exitPrice === null || instrument === undefined) return null;
    const currency = instrument.profitCurrency;
    const rate = isRateCurrency(currency)
      ? (ratesByCurrency.get(currency)?.get(row.tradeDate) ?? null)
      : null;
    return calculateUsdPnl({
      direction: row.direction,
      entryPrice: row.entryPrice,
      exitPrice: row.exitPrice,
      contracts: row.contracts,
      pointValue: Number(instrument.pointValue),
      profitCurrency: currency,
      profitRateVsUsd: rate,
    }).pnlCents;
  });
}

/**
 * Matches every row against the journal and reports what would happen. The
 * pairing itself is pure (src/domain/import/match.ts); this only supplies it
 * with candidates and turns the verdicts into something the preview can print.
 */
function buildPreview(
  rows: NormalizedTrade[],
  candidates: Awaited<ReturnType<typeof listMatchCandidates>>,
  currency: AccountCurrency,
  pnl: (RowPnl | null)[],
  computed: (number | null)[],
): { preview: ImportPreview; outcomes: ReturnType<typeof decideOutcome>[] } {
  const matched = matchRows(rows, candidates);
  const outcomes = rows.map((row, index) => decideOutcome(row, matched[index]));

  const counters: ImportCounters = { new: 0, update: 0, skip: 0 };
  const previewRows = rows.map((row, index): PreviewRow => {
    const outcome = outcomes[index];
    const money = {
      filePnlCents: row.filePnlCents,
      pnlUsdCents: pnl[index]?.usdCents ?? null,
      computedPnlCents: computed[index] ?? null,
      fxRateDate: pnl[index]?.fxRateDate ?? null,
      provisional: pnl[index]?.provisional ?? false,
    };

    if (outcome.kind === "skip") {
      counters.skip += 1;
      return {
        sourceRow: row.sourceRow,
        verdict: "skip" as const,
        reason: "already in your journal",
        ...money,
      };
    }

    if (outcome.kind === "update") {
      counters.update += 1;
      const closesOpen = outcome.changed.includes("exitPrice");
      return {
        sourceRow: row.sourceRow,
        verdict: "update" as const,
        reason: closesOpen
          ? "closes an open trade"
          : `updates ${outcome.changed.join(", ")}`,
        ...money,
      };
    }

    counters.new += 1;
    return {
      sourceRow: row.sourceRow,
      verdict: "new" as const,
      reason: row.exitPrice === null ? "new, still open" : "new",
      ...money,
    };
  });

  return { preview: { rows: previewRows, counters, currency }, outcomes };
}

/** Dates the file mentions, deduplicated — the read is bounded by these. */
function datesOf(rows: NormalizedTrade[]): string[] {
  return [...new Set(rows.map((row) => row.tradeDate))];
}

/**
 * Reads nothing back into the journal. It exists so the preview can show the
 * four counters and a reason per row before anything is written.
 */
export async function previewImport(
  input: unknown,
): Promise<ActionResult<ImportPreview>> {
  const parsed = previewImportSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const user = await getCurrentUser();

    // An account id from the client is a permission boundary, not a label
    // (coding-standards.md, Database). findImportAccount also drops an
    // archived account, which is not a valid import target.
    const account = await findImportAccount(user.id, parsed.data.accountId);
    if (account === null) {
      return { success: false, error: "That account isn't yours" };
    }

    const converted = await convertRows(parsed.data.rows, account.currency);
    if (!converted.ok) return { success: false, error: converted.error };

    const candidates = await listMatchCandidates(
      user.id,
      account.id,
      datesOf(parsed.data.rows),
    );

    const { preview } = buildPreview(
      parsed.data.rows,
      candidates,
      account.currency,
      converted.pnl,
      await computePnl(parsed.data.rows),
    );
    return { success: true, data: preview };
  } catch {
    return {
      success: false,
      error: "Couldn't read your journal to compare against. Try again.",
    };
  }
}

export interface ImportResult extends ImportCounters {
  batchId: number | null;
}

/**
 * Writes the batch. One transaction: either the whole file lands or none of
 * it does.
 *
 * The match runs again here rather than trusting the preview's verdicts — the
 * journal can change between looking and confirming, and the client is not
 * the authority on what is already in it.
 */
export async function commitImport(
  input: unknown,
): Promise<ActionResult<ImportResult>> {
  const parsed = commitImportSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const { accountId, filename, detectedShape, rows } = parsed.data;

  let result: ImportResult;

  try {
    const user = await getCurrentUser();

    const account = await findImportAccount(user.id, accountId);
    if (account === null) {
      return { success: false, error: "That account isn't yours" };
    }

    // Converted again rather than taken from the preview: the client is not
    // the authority on amounts, and a rate may have been published since.
    const converted = await convertRows(rows, account.currency);
    if (!converted.ok) return { success: false, error: converted.error };

    const candidates = await listMatchCandidates(
      user.id,
      accountId,
      datesOf(rows),
    );
    const { preview, outcomes } = buildPreview(
      rows,
      candidates,
      account.currency,
      converted.pnl,
      [],
    );

    const written = preview.counters.new + preview.counters.update;
    if (written === 0) {
      return {
        success: true,
        data: { ...preview.counters, batchId: null },
      };
    }

    result = await db.transaction(async (tx) => {
      const batchId = await createImportBatch(tx, {
        userId: user.id,
        accountId,
        filename,
        rowCount: written,
        detectedShape,
      });

      const toInsert: ImportedTrade[] = [];
      const toUpdate: TradeUpdate[] = [];

      for (const [index, outcome] of outcomes.entries()) {
        const row = rows[index];

        if (outcome.kind === "skip") continue;

        if (outcome.kind === "update") {
          // Collected, not written yet: the updates go out grouped by the
          // fields they touch, so a file of 500 closed positions costs one
          // statement rather than 500.
          toUpdate.push({ tradeId: outcome.tradeId, values: outcome.values });
          continue;
        }

        const points = derivePoints(
          row.direction,
          row.entryPrice,
          row.exitPrice,
        );

        toInsert.push({
          userId: user.id,
          tradeDate: row.tradeDate,
          instrumentId: row.instrumentId,
          contracts: row.contracts,
          entryTime: row.entryTime,
          exitTime: row.exitTime,
          direction: row.direction,
          entryPrice: row.entryPrice,
          exitPrice: row.exitPrice,
          points,
          result: deriveResult(points),
          // Only ever on a row the import creates itself, and only from the
          // entry time. A session the user picked is never overwritten.
          // The zone is the trader's own: the windows are New York times and
          // the entry time is not, so the two are reconciled by date.
          session: sessionFromEntryTime(
            row.entryTime,
            row.tradeDate,
            user.timezone,
          ),
          brokerTradeKey: row.brokerTradeKey,
          stopPrice: row.stopPrice,
          pnl: converted.pnl[index],
          importBatchId: batchId,
        });
      }

      await updateImportedTrades(tx, user.id, toUpdate);
      await insertImportedTrades(tx, toInsert, accountId);

      return { ...preview.counters, batchId };
    });

    // Once per batch, after the transaction committed — not per row. A badge
    // that depends on trade count should see the finished import, and a badge
    // failure must not take the import down with it.
    await awardBadgesQuietly(user.id, user.timezone);
  } catch {
    return {
      success: false,
      error: "Nothing was imported — the whole batch was rolled back.",
    };
  }

  revalidatePath("/", "layout");
  return { success: true, data: result };
}

/**
 * Removes one batch's untouched trades.
 *
 * Anything worked on by hand stays, hand-logged trades are never in scope,
 * and badges already earned stay earned — `syncUserBadges` only ever adds.
 */
export async function undoImportBatch(
  input: unknown,
): Promise<ActionResult<{ removed: number }>> {
  const parsed = undoImportSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  let removed: number;

  try {
    const user = await getCurrentUser();
    removed = await db.transaction((tx) =>
      removeUntouchedTrades(tx, user.id, parsed.data.batchId),
    );
  } catch {
    return {
      success: false,
      error: "Couldn't remove that import. Nothing was changed.",
    };
  }

  revalidatePath("/", "layout");
  return { success: true, data: { removed } };
}

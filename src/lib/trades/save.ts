// Saving a trade logged or edited by hand (save-trade). The server actions
// parse the input, identify the user and call this; everything between — the
// checks that keep a trader's data theirs, the columns and the P&L, each
// account's commission and the write — happens here, so it can be tested
// against Postgres without a request. Badges and page refreshes stay in the
// actions: they belong to the request, not to the save.
//
// The import path does not come through here. It writes the file's P&L as an
// override and has its own commission rule (src/db/queries/import.ts).

import { db } from "../../db/index.ts";
import { listOwnedAccountIds } from "../../db/queries/accounts.ts";
import { listCommissionRates } from "../../db/queries/commission-rates.ts";
import {
  ensureFxRates,
  listForeignCurrencies,
  type RateFetcher,
  storedRateOn,
} from "../../db/queries/fx.ts";
import { getInstrumentById } from "../../db/queries/instruments.ts";
import {
  countExistingConfluenceTags,
  countExistingMistakeTags,
  insertTradeWithRelations,
} from "../../db/queries/trades.ts";
import {
  commissionOnSave,
  type StoredCommission,
} from "../../domain/commission.ts";
import { isRateCurrency } from "../../domain/fx.ts";
import { calculateUsdPnl } from "../../domain/pnl.ts";
import { validateTradeAccountAssignment } from "../../domain/trades.ts";
import type { CreateTradeInput } from "../../schemas/trades.ts";
import { fetchEcbRates } from "../fx/frankfurter.ts";
import { dollarsToCents, exactCents } from "../money.ts";

/** Whatever runs the save: the shared client, or a transaction in a test. */
export type SaveExecutor = Pick<
  typeof db,
  "select" | "selectDistinct" | "insert" | "execute" | "transaction"
>;

export interface SaveOptions {
  /** Where missing exchange rates come from; the ECB unless a test says so. */
  fetcher?: RateFetcher;
  executor?: SaveExecutor;
}

export type SaveTradeResult =
  | {
      success: true;
      data: { id: number; pnlCents: number | null; rMultiple: number | null };
    }
  | { success: false; error: string };

/**
 * Every column a trade write sets, derived once so create and update cannot
 * disagree about a single one.
 *
 * Writing the *whole* set on an update is deliberate: switching an entry from
 * taken to missed has to clear the exit, the contracts, the result and the
 * override, and a partial update would leave them standing as ghosts behind a
 * `taken = false` row. `points` is recomputed here for the same reason — it is
 * a stored column, so a changed price that skipped it would be silently wrong
 * in every export.
 *
 * `importBatchId` and `brokerTradeKey` are absent on purpose: an edited
 * imported trade keeps its provenance. Hand-editing it is what protects it
 * from an undo anyway (src/db/queries/import.ts, TOUCHED).
 */
export function buildTradeColumns(data: CreateTradeInput, profit: ProfitRate) {
  let pnlCents: number | null = null;
  let rMultiple: number | null = null;
  let points: string | null = null;

  if (data.taken) {
    const result = calculateUsdPnl(
      {
        direction: data.direction,
        entryPrice: data.entryPrice,
        exitPrice: data.exitPrice,
        contracts: data.contracts,
        pointValue: profit.pointValue,
        stopPrice: data.stopPrice,
        profitCurrency: profit.currency,
        profitRateVsUsd: profit.rateVsUsd,
      },
      data.pnlOverride !== undefined
        ? dollarsToCents(data.pnlOverride)
        : undefined,
    );
    pnlCents = result.pnlCents;
    rMultiple = result.rMultiple;

    const rawPoints =
      data.direction === "long"
        ? data.exitPrice - data.entryPrice
        : data.entryPrice - data.exitPrice;
    points = rawPoints.toFixed(5);
  }

  return {
    pnlCents,
    rMultiple,
    columns: {
      tradeDate: data.tradeDate,
      instrumentId: data.instrumentId,
      taken: data.taken,
      contracts: data.taken ? String(data.contracts) : null,
      entryTime: data.entryTime,
      exitTime: data.taken ? data.exitTime : null,
      session: data.session ?? null,
      direction: data.direction,
      setupType: data.setupType ?? null,
      entryModel: data.entryModel ?? null,
      entryPrice: String(data.entryPrice),
      exitPrice: data.taken ? String(data.exitPrice) : null,
      stopPrice: data.stopPrice !== undefined ? String(data.stopPrice) : null,
      mfeR: data.mfeR !== undefined ? String(data.mfeR) : null,
      maeR: data.maeR !== undefined ? String(data.maeR) : null,
      postExitMfeR:
        data.taken && data.postExitMfeR !== undefined
          ? String(data.postExitMfeR)
          : null,
      points,
      pnlOverride:
        data.taken && data.pnlOverride !== undefined
          ? String(data.pnlOverride)
          : null,
      result: data.taken ? (data.result ?? null) : null,
      grade: data.grade ?? null,
      felt: data.felt ?? null,
      byTheBook: data.taken ? (data.byTheBook ?? null) : null,
      notes: data.notes ?? null,
    },
  };
}

interface ProfitRate {
  pointValue: number;
  currency: string;
  /** Null for USD, or while no rate for the currency is stored. */
  rateVsUsd: string | null;
}

/**
 * The point value and the rate a trade's P&L from prices is converted with
 * (ftmo-cfd-instruments). For an instrument that settles in another currency
 * the trade date's rate is fetched first — best effort like
 * `ensureDisplayRates`: the figures read the rate in SQL and fall back to the
 * nearest stored one, and job:fx fetches what is still missing.
 */
export async function profitRateFor(
  instrument: { pointValue: string; profitCurrency: string },
  tradeDate: string,
  fetcher: RateFetcher = fetchEcbRates,
  executor: SaveExecutor = db,
): Promise<ProfitRate> {
  const pointValue = Number(instrument.pointValue);
  const currency = instrument.profitCurrency;
  if (!isRateCurrency(currency)) {
    return { pointValue, currency, rateVsUsd: null };
  }
  try {
    await ensureFxRates(currency, [tradeDate], fetcher, executor);
  } catch (error) {
    console.error("profitRateFor: rate not stored", error);
  }
  return {
    pointValue,
    currency,
    rateVsUsd: await storedRateOn(currency, tradeDate, executor),
  };
}

/**
 * Makes sure the rate of this trade's date is stored when it sits on an
 * account kept in another currency, so the account's figures can be shown in
 * that currency (display-currency). Best effort, on purpose: a trade is saved
 * whatever the ECB says, the display falls back to the nearest stored rate,
 * and job:fx fetches what is still missing overnight.
 */
export async function ensureDisplayRates(
  userId: number,
  accountIds: number[],
  tradeDate: string,
  fetcher: RateFetcher = fetchEcbRates,
  executor: SaveExecutor = db,
): Promise<void> {
  try {
    const currencies = await listForeignCurrencies(
      userId,
      accountIds,
      executor,
    );
    for (const currency of currencies) {
      await ensureFxRates(currency, [tradeDate], fetcher, executor);
    }
  } catch (error) {
    console.error("ensureDisplayRates: rate not stored", error);
  }
}

// Same "an id from the client is untrusted until checked" treatment the
// account ids get, applied to the two tag join tables. Returns the message to
// hand back, or null when everything exists.
export async function findUnknownTagError(
  data: CreateTradeInput,
  executor: SaveExecutor = db,
): Promise<string | null> {
  const [existingConfluenceTagCount, existingMistakeTagCount] =
    await Promise.all([
      countExistingConfluenceTags(data.confluenceTagIds, executor),
      countExistingMistakeTags(data.mistakeTagIds, executor),
    ]);
  if (existingConfluenceTagCount !== data.confluenceTagIds.length) {
    return "One or more confluence tags not found";
  }
  if (existingMistakeTagCount !== data.mistakeTagIds.length) {
    return "One or more mistake tags not found";
  }
  return null;
}

interface CommissionContext {
  userId: number;
  accountIds: number[];
  instrumentId: number;
  contracts: number;
  /** Amounts the user typed, by account, in dollars as the schema read them. */
  typed: { accountId: number; amount: number }[];
  /** Each account's commission before this save; empty on create. */
  existing: Map<number, StoredCommission | null>;
  basisChanged: boolean;
  /** The trade's P&L after this save is still an import file's own. */
  pnlFromFile: boolean;
}

/**
 * What each assigned account pays after this save — `commissionOnSave` per
 * account, with the account's rate for the trade's instrument (commissions).
 * An amount typed for an account the trade is not on is ignored.
 */
export async function commissionsOnSave(
  context: CommissionContext,
  executor: SaveExecutor = db,
): Promise<Map<number, StoredCommission | null>> {
  const rates = await listCommissionRates(
    context.userId,
    context.accountIds,
    executor,
  );
  const typed = new Map(
    context.typed.map((entry) => [entry.accountId, entry.amount]),
  );

  return new Map(
    context.accountIds.map((accountId) => {
      const amount = typed.get(accountId);
      const rate = rates.find(
        (candidate) =>
          candidate.accountId === accountId &&
          candidate.instrumentId === context.instrumentId,
      );
      return [
        accountId,
        commissionOnSave({
          typedCents:
            amount === undefined ? undefined : (exactCents(amount) ?? 0),
          existing: context.existing.get(accountId) ?? null,
          perSideCents: rate?.perSideCents ?? null,
          contracts: context.contracts,
          basisChanged: context.basisChanged,
          pnlFromFile: context.pnlFromFile,
        }),
      ];
    }),
  );
}

/**
 * Saves a new trade for this user: the id, P&L and R, or the message the form
 * shows. Nothing is written when a check fails.
 */
export async function saveTrade(
  userId: number,
  data: CreateTradeInput,
  { fetcher = fetchEcbRates, executor = db }: SaveOptions = {},
): Promise<SaveTradeResult> {
  const instrument = await getInstrumentById(data.instrumentId, executor);
  if (!instrument) {
    return { success: false, error: "Instrument not found" };
  }

  const tagError = await findUnknownTagError(data, executor);
  if (tagError) {
    return { success: false, error: tagError };
  }

  // Never trust client-supplied account ids — re-check ownership before
  // anything else. A missed setup submits no ids, so this stays empty.
  const ownedAccountIds = data.taken
    ? await listOwnedAccountIds(userId, data.accountIds, executor)
    : [];

  const assignment = validateTradeAccountAssignment({
    taken: data.taken,
    accountIds: ownedAccountIds,
  });
  if (!assignment.success) {
    return { success: false, error: assignment.error };
  }

  const { columns, pnlCents, rMultiple } = buildTradeColumns(
    data,
    await profitRateFor(instrument, data.tradeDate, fetcher, executor),
  );

  const accountCommissions = data.taken
    ? await commissionsOnSave(
        {
          userId,
          accountIds: ownedAccountIds,
          instrumentId: instrument.id,
          contracts: data.contracts,
          typed: data.commissions,
          existing: new Map(),
          basisChanged: false,
          // A trade logged by hand never carries a file's P&L.
          pnlFromFile: false,
        },
        executor,
      )
    : new Map();

  const createdId = await executor.transaction((tx) =>
    insertTradeWithRelations(
      tx,
      userId,
      columns,
      {
        accountIds: ownedAccountIds,
        accountCommissions,
        confluenceTagIds: data.confluenceTagIds,
        mistakeTagIds: data.mistakeTagIds,
      },
      data.links,
    ),
  );

  await ensureDisplayRates(
    userId,
    ownedAccountIds,
    data.tradeDate,
    fetcher,
    executor,
  );

  return { success: true, data: { id: createdId, pnlCents, rMultiple } };
}

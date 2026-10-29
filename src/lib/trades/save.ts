import { messageKey } from "../i18n/message-keys.ts";
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
import {
  listAssignableAccounts,
  listOwnedAccountIds,
} from "../../db/queries/accounts.ts";
import { listCommissionRates } from "../../db/queries/commission-rates.ts";
import {
  ensureFxRates,
  listForeignCurrencies,
  type RateFetcher,
  storedRateOn,
} from "../../db/queries/fx.ts";
import { getInstrumentById } from "../../db/queries/instruments.ts";
import {
  getAssignableRevisionId,
  getRevisionStrategyId,
} from "../../db/queries/strategies.ts";
import {
  countExistingConfluenceTags,
  countExistingMistakeTags,
  getOwnedTrade,
  insertTradeWithRelations,
  listAssignmentCommissions,
  replaceTradeWithRelations,
  type TradeRelationIds,
  type TradeWriteColumns,
} from "../../db/queries/trades.ts";
import {
  commissionOnSave,
  type StoredCommission,
} from "../../domain/commission.ts";
import { isRateCurrency } from "../../domain/fx.ts";
import { calculateUsdPnl } from "../../domain/pnl.ts";
import {
  byTheBookAfterSave,
  type ImportMarks,
  importMarksAfterEdit,
  strategyAssignmentChanged,
  validateTradeAccountAssignment,
} from "../../domain/trades.ts";
import type { CreateTradeInput } from "../../schemas/trades.ts";
import { fetchEcbRates } from "../fx/frankfurter.ts";
import { dollarsToCents, exactCents } from "../money.ts";

/** Whatever runs the save: the shared client, or a transaction in a test. */
export type SaveExecutor = Pick<
  typeof db,
  "select" | "selectDistinct" | "insert" | "execute" | "transaction"
>;

export interface SaveOptions {
  /** The trade to edit; without it a new trade is created. */
  tradeId?: number;
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
function buildTradeColumns(
  data: CreateTradeInput,
  profit: ProfitRate,
  strategy: StrategyAssignment,
) {
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
      byTheBook: byTheBookAfterSave({
        taken: data.taken,
        assignmentChanged: strategy.changed,
        submitted: data.taken ? data.byTheBook : undefined,
      }),
      strategyRevisionId: strategy.revisionId,
      notes: data.notes ?? null,
    },
  };
}

/** The revision a save stores, and whether the assignment changed. */
interface StrategyAssignment {
  revisionId: number | null;
  changed: boolean;
}

const STRATEGY_NOT_ASSIGNABLE = messageKey("validation.strategyNotAssignable");

/**
 * What the save does with the strategy. An unchanged strategy keeps the
 * stored revision, whatever its archive state, unless the trader asked to
 * adopt the current rules. A new or switched one resolves to the strategy's
 * current rules, and only for the user's own active strategy: the id comes
 * from the client. Clearing stores no revision.
 */
async function resolveStrategyAssignment(
  userId: number,
  requestedStrategyId: number | null | undefined,
  adoptCurrentRules: boolean,
  existing: ExistingTrade | null,
  executor: SaveExecutor,
): Promise<
  ({ success: true } & StrategyAssignment) | { success: false; error: string }
> {
  const storedRevisionId = existing?.strategyRevisionId ?? null;
  const storedStrategyId =
    storedRevisionId === null
      ? null
      : await getRevisionStrategyId(storedRevisionId, executor);
  // A request that names no strategy leaves the assignment alone; clearing
  // is an explicit null.
  const requested =
    requestedStrategyId === undefined ? storedStrategyId : requestedStrategyId;
  const changed = strategyAssignmentChanged(storedStrategyId, requested);

  if (!changed) {
    if (!adoptCurrentRules || requested === null) {
      return { success: true, revisionId: storedRevisionId, changed };
    }
    // Same strategy, explicitly on its current rules. Only a different
    // revision is a change: the current one being stored already keeps the
    // answer.
    const currentRevisionId = await getAssignableRevisionId(
      userId,
      requested,
      executor,
    );
    if (currentRevisionId === null) {
      return { success: false, error: STRATEGY_NOT_ASSIGNABLE };
    }
    return {
      success: true,
      revisionId: currentRevisionId,
      changed: currentRevisionId !== storedRevisionId,
    };
  }
  if (requested === null) {
    return { success: true, revisionId: null, changed };
  }
  const revisionId = await getAssignableRevisionId(userId, requested, executor);
  if (revisionId === null) {
    return { success: false, error: STRATEGY_NOT_ASSIGNABLE };
  }
  return { success: true, revisionId, changed };
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
async function profitRateFor(
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
async function ensureDisplayRates(
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
async function findUnknownTagError(
  data: CreateTradeInput,
  executor: SaveExecutor = db,
): Promise<string | null> {
  const [existingConfluenceTagCount, existingMistakeTagCount] =
    await Promise.all([
      countExistingConfluenceTags(data.confluenceTagIds, executor),
      countExistingMistakeTags(data.mistakeTagIds, executor),
    ]);
  if (existingConfluenceTagCount !== data.confluenceTagIds.length) {
    return messageKey("errors.confluenceTagsNotFound");
  }
  if (existingMistakeTagCount !== data.mistakeTagIds.length) {
    return messageKey("errors.mistakeTagsNotFound");
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
async function commissionsOnSave(
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

type ExistingTrade = NonNullable<Awaited<ReturnType<typeof getOwnedTrade>>>;

/**
 * The submitted account ids that pass the ownership check. Never trust
 * client-supplied account ids. A new trade may only go onto the user's active
 * accounts; an edit also keeps an archived account the trade already sits on
 * — dropping it would strip an assignment the user never touched off a trade
 * that predates the archiving — but cannot add a different archived one.
 */
async function assignableAccountIds(
  userId: number,
  accountIds: number[],
  existing: ExistingTrade | null,
  executor: SaveExecutor,
): Promise<number[]> {
  if (!existing) {
    return listOwnedAccountIds(userId, accountIds, executor);
  }
  const assignable = await listAssignableAccounts(
    userId,
    existing.id,
    executor,
  );
  const assignableIds = new Set(assignable.map((account) => account.id));
  return accountIds.filter((id) => assignableIds.has(id));
}

type TradeColumns = ReturnType<typeof buildTradeColumns>["columns"];

interface EditContext {
  /** The trade being edited and the import marks it keeps; null on create. */
  edit: { trade: ExistingTrade; marks: ImportMarks } | null;
  /** Each account's commission before this save; empty on create. */
  storedCommissions: Map<number, StoredCommission | null>;
  basisChanged: boolean;
  pnlFromFile: boolean;
}

/**
 * What only an edit brings to the save. Only a changed contract count or
 * instrument makes a rate-derived commission stale; a rate changed in
 * Settings since does not (commissions). While the P&L is still the file's
 * own, it is net already and no rate applies.
 */
async function editContextFor(
  existing: ExistingTrade | null,
  columns: TradeColumns,
  executor: SaveExecutor,
): Promise<EditContext> {
  if (!existing) {
    // A trade logged by hand never carries a file's P&L.
    return {
      edit: null,
      storedCommissions: new Map(),
      basisChanged: false,
      pnlFromFile: false,
    };
  }
  const marks = importMarksAfterEdit(existing, columns);
  return {
    edit: { trade: existing, marks },
    storedCommissions: await listAssignmentCommissions(existing.id, executor),
    basisChanged:
      existing.instrumentId !== columns.instrumentId ||
      existing.contracts === null ||
      Number(existing.contracts) !== Number(columns.contracts),
    pnlFromFile: marks.pnlSource !== null,
  };
}

/**
 * Inserts a new trade with its links, or rewrites the edited one with its
 * import marks, in one transaction; returns the trade's id.
 */
async function writeTrade(
  userId: number,
  columns: TradeWriteColumns,
  relations: TradeRelationIds,
  links: CreateTradeInput["links"],
  edit: EditContext["edit"],
  executor: SaveExecutor,
): Promise<number> {
  return executor.transaction(async (tx) => {
    if (!edit) {
      return insertTradeWithRelations(tx, userId, columns, relations, links);
    }
    await replaceTradeWithRelations(
      tx,
      edit.trade.id,
      { ...columns, ...edit.marks },
      relations,
    );
    return edit.trade.id;
  });
}

/**
 * Saves a trade for this user — a new one, or with `tradeId` an edit of one
 * of theirs: the id, P&L and R, or the message the form shows. Nothing is
 * written when a check fails.
 *
 * An edit replaces every column, the accounts and the tags; links stay
 * managed by their own actions while the form is open, so only a new trade
 * writes the links it was sent.
 */
export async function saveTrade(
  userId: number,
  data: CreateTradeInput,
  { tradeId, fetcher = fetchEcbRates, executor = db }: SaveOptions = {},
): Promise<SaveTradeResult> {
  let existing: ExistingTrade | null = null;
  if (tradeId !== undefined) {
    existing = (await getOwnedTrade(userId, tradeId, executor)) ?? null;
    if (!existing) {
      return { success: false, error: messageKey("errors.tradeNotFound") };
    }
  }

  const instrument = await getInstrumentById(data.instrumentId, executor);
  if (!instrument) {
    return { success: false, error: messageKey("errors.instrumentNotFound") };
  }

  const tagError = await findUnknownTagError(data, executor);
  if (tagError) {
    return { success: false, error: tagError };
  }

  // Ownership before anything else. A missed setup submits no ids, so this
  // stays empty.
  const accountIds = data.taken
    ? await assignableAccountIds(userId, data.accountIds, existing, executor)
    : [];

  const assignment = validateTradeAccountAssignment({
    taken: data.taken,
    accountIds,
  });
  if (!assignment.success) {
    return { success: false, error: assignment.error };
  }

  const strategy = await resolveStrategyAssignment(
    userId,
    data.strategyId,
    data.adoptCurrentStrategyRules === true,
    existing,
    executor,
  );
  if (!strategy.success) {
    return { success: false, error: strategy.error };
  }

  const { columns, pnlCents, rMultiple } = buildTradeColumns(
    data,
    await profitRateFor(instrument, data.tradeDate, fetcher, executor),
    strategy,
  );
  const context = await editContextFor(existing, columns, executor);

  const accountCommissions = data.taken
    ? await commissionsOnSave(
        {
          userId,
          accountIds,
          instrumentId: instrument.id,
          contracts: data.contracts,
          typed: data.commissions,
          existing: context.storedCommissions,
          basisChanged: context.basisChanged,
          pnlFromFile: context.pnlFromFile,
        },
        executor,
      )
    : new Map();

  const savedId = await writeTrade(
    userId,
    columns,
    {
      accountIds,
      accountCommissions,
      confluenceTagIds: data.confluenceTagIds,
      mistakeTagIds: data.mistakeTagIds,
    },
    data.links,
    context.edit,
    executor,
  );

  await ensureDisplayRates(
    userId,
    accountIds,
    data.tradeDate,
    fetcher,
    executor,
  );

  return { success: true, data: { id: savedId, pnlCents, rMultiple } };
}

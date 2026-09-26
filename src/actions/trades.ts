"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/index";
import {
  listAssignableAccounts,
  listOwnedAccountIds,
} from "@/db/queries/accounts";
import {
  ensureFxRates,
  listForeignCurrencies,
  storedRateOn,
} from "@/db/queries/fx";
import { getInstrumentById } from "@/db/queries/instruments";
import {
  countExistingConfluenceTags,
  countExistingMistakeTags,
  getNextLinkSortOrder,
  getOwnedTrade,
  insertTradeWithRelations,
  replaceTradeWithRelations,
} from "@/db/queries/trades";
import { tradeLinks, tradeScreenshots, trades } from "@/db/schema/trades";
import { isRateCurrency } from "@/domain/fx";
import { calculateUsdPnl } from "@/domain/pnl";
import {
  importMarksAfterEdit,
  validateTradeAccountAssignment,
} from "@/domain/trades";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { awardBadgesQuietly } from "@/lib/badges/sync";
import { fetchEcbRates } from "@/lib/fx/frankfurter";
import { dollarsToCents } from "@/lib/money";
import { storage } from "@/lib/storage";
import {
  addTradeLinkSchema,
  type CreateTradeInput,
  createTradeSchema,
  deleteTradeLinkSchema,
  deleteTradeSchema,
  deleteTradeScreenshotSchema,
  updateTradeSchema,
} from "@/schemas/trades";

type ActionResult<T> =
  | { success: true; data: T }
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
function buildTradeColumns(data: CreateTradeInput, profit: ProfitRate) {
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
async function profitRateFor(
  instrument: { pointValue: string; profitCurrency: string },
  tradeDate: string,
): Promise<ProfitRate> {
  const pointValue = Number(instrument.pointValue);
  const currency = instrument.profitCurrency;
  if (!isRateCurrency(currency)) {
    return { pointValue, currency, rateVsUsd: null };
  }
  try {
    await ensureFxRates(currency, [tradeDate], fetchEcbRates);
  } catch (error) {
    console.error("profitRateFor: rate not stored", error);
  }
  return {
    pointValue,
    currency,
    rateVsUsd: await storedRateOn(currency, tradeDate),
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
): Promise<void> {
  try {
    const currencies = await listForeignCurrencies(userId, accountIds);
    for (const currency of currencies) {
      await ensureFxRates(currency, [tradeDate], fetchEcbRates);
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
): Promise<string | null> {
  const [existingConfluenceTagCount, existingMistakeTagCount] =
    await Promise.all([
      countExistingConfluenceTags(data.confluenceTagIds),
      countExistingMistakeTags(data.mistakeTagIds),
    ]);
  if (existingConfluenceTagCount !== data.confluenceTagIds.length) {
    return "One or more confluence tags not found";
  }
  if (existingMistakeTagCount !== data.mistakeTagIds.length) {
    return "One or more mistake tags not found";
  }
  return null;
}

export async function createTrade(input: unknown): Promise<
  ActionResult<{
    id: number;
    pnlCents: number | null;
    rMultiple: number | null;
  }>
> {
  const parsed = createTradeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const user = await getCurrentUser();

  const instrument = await getInstrumentById(data.instrumentId);
  if (!instrument) {
    return { success: false, error: "Instrument not found" };
  }

  const tagError = await findUnknownTagError(data);
  if (tagError) {
    return { success: false, error: tagError };
  }

  // Never trust client-supplied account ids — re-check ownership before
  // anything else. A missed setup submits no ids, so this stays empty.
  const ownedAccountIds = data.taken
    ? await listOwnedAccountIds(user.id, data.accountIds)
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
    await profitRateFor(instrument, data.tradeDate),
  );

  const createdId = await db.transaction((tx) =>
    insertTradeWithRelations(
      tx,
      user.id,
      columns,
      {
        accountIds: ownedAccountIds,
        confluenceTagIds: data.confluenceTagIds,
        mistakeTagIds: data.mistakeTagIds,
      },
      data.links,
    ),
  );

  await ensureDisplayRates(user.id, ownedAccountIds, data.tradeDate);
  await awardBadgesQuietly(user.id, user.timezone);

  revalidatePath("/journal");
  revalidatePath("/dashboard");
  return { success: true, data: { id: createdId, pnlCents, rMultiple } };
}

/**
 * Rewrites one existing trade from the same payload the new-trade form sends.
 *
 * Every column and all three join tables are replaced, never merged: a tag the
 * user unticked has to disappear, and only "delete then insert" says that.
 *
 * `links` is deliberately ignored here. On an existing trade the form manages
 * links through addTradeLink/deleteTradeLink as it always has, so replacing
 * them from the payload would delete rows the user never touched in this
 * form — and screenshots, which cannot travel in a Server Action at all, would
 * still be handled separately either way.
 */
export async function updateTrade(
  input: unknown,
): Promise<
  ActionResult<{ pnlCents: number | null; rMultiple: number | null }>
> {
  const parsed = updateTradeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const { tradeId, trade: data } = parsed.data;

  const user = await getCurrentUser();
  const existing = await getOwnedTrade(user.id, tradeId);
  if (!existing) {
    return { success: false, error: "Trade not found" };
  }

  const instrument = await getInstrumentById(data.instrumentId);
  if (!instrument) {
    return { success: false, error: "Instrument not found" };
  }

  const tagError = await findUnknownTagError(data);
  if (tagError) {
    return { success: false, error: tagError };
  }

  // Not listOwnedAccountIds: that one rejects archived accounts, which is
  // right for a new trade and wrong here — it would strip an assignment the
  // user never touched off a trade that predates the archiving. An archived
  // account this trade already sits on stays selectable, a different one does
  // not.
  const assignable = data.taken
    ? await listAssignableAccounts(user.id, existing.id)
    : [];
  const assignableIds = new Set(assignable.map((account) => account.id));
  const accountIds = data.taken
    ? data.accountIds.filter((id) => assignableIds.has(id))
    : [];

  const assignment = validateTradeAccountAssignment({
    taken: data.taken,
    accountIds,
  });
  if (!assignment.success) {
    return { success: false, error: assignment.error };
  }

  const { columns, pnlCents, rMultiple } = buildTradeColumns(
    data,
    await profitRateFor(instrument, data.tradeDate),
  );

  await db.transaction((tx) =>
    replaceTradeWithRelations(
      tx,
      existing.id,
      { ...columns, ...importMarksAfterEdit(existing, columns) },
      {
        accountIds,
        confluenceTagIds: data.confluenceTagIds,
        mistakeTagIds: data.mistakeTagIds,
      },
    ),
  );

  await ensureDisplayRates(user.id, accountIds, data.tradeDate);
  await awardBadgesQuietly(user.id, user.timezone);

  revalidatePath("/journal");
  revalidatePath(`/journal/${existing.id}`);
  revalidatePath("/dashboard");
  return { success: true, data: { pnlCents, rMultiple } };
}

/**
 * Removes one trade for good, with its assignments, tags, links, screenshot
 * rows and screenshot files.
 *
 * The five join tables carry ON DELETE CASCADE on `trade_id`, so the database
 * clears itself; only the bytes in storage need collecting first, because
 * their keys live in a row that is about to be gone.
 *
 * Rows first, files second. If the storage call fails the user is left with an
 * orphaned object nobody can reach — cheap. The other order would leave a
 * trade whose thumbnails 404.
 */
export async function deleteTrade(input: unknown): Promise<ActionResult<null>> {
  const parsed = deleteTradeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await getCurrentUser();
  const trade = await getOwnedTrade(user.id, parsed.data.tradeId);
  if (!trade) {
    return { success: false, error: "Trade not found" };
  }

  const screenshots = await db
    .select({ storageKey: tradeScreenshots.storageKey })
    .from(tradeScreenshots)
    .where(eq(tradeScreenshots.tradeId, trade.id));

  await db.delete(trades).where(eq(trades.id, trade.id));

  if (screenshots.length > 0) {
    await storage.deleteMany(screenshots.map((row) => row.storageKey));
  }

  revalidatePath("/journal");
  revalidatePath("/dashboard");
  return { success: true, data: null };
}

// Attaching a link afterward reuses the same ownership check and https
// validation as createTrade — a tradeId from the client is never trusted
// until it's confirmed to belong to the current user.
export async function addTradeLink(
  input: unknown,
): Promise<ActionResult<{ id: number }>> {
  const parsed = addTradeLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await getCurrentUser();
  const trade = await getOwnedTrade(user.id, parsed.data.tradeId);
  if (!trade) {
    return { success: false, error: "Trade not found" };
  }

  const sortOrder = await getNextLinkSortOrder(trade.id);
  const [created] = await db
    .insert(tradeLinks)
    .values({
      tradeId: trade.id,
      url: parsed.data.url,
      label: parsed.data.label ?? null,
      sortOrder,
    })
    .returning({ id: tradeLinks.id });

  revalidatePath("/journal");
  return { success: true, data: { id: created.id } };
}

export async function deleteTradeLink(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = deleteTradeLinkSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await getCurrentUser();
  const trade = await getOwnedTrade(user.id, parsed.data.tradeId);
  if (!trade) {
    return { success: false, error: "Trade not found" };
  }

  await db
    .delete(tradeLinks)
    .where(
      and(
        eq(tradeLinks.id, parsed.data.linkId),
        eq(tradeLinks.tradeId, trade.id),
      ),
    );

  revalidatePath("/journal");
  return { success: true, data: null };
}

// Deletion has no binary transport involved, so unlike the upload itself it
// stays a Server Action rather than living in the route handler.
export async function deleteTradeScreenshot(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = deleteTradeScreenshotSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await getCurrentUser();
  const trade = await getOwnedTrade(user.id, parsed.data.tradeId);
  if (!trade) {
    return { success: false, error: "Trade not found" };
  }

  const [screenshot] = await db
    .select({ storageKey: tradeScreenshots.storageKey })
    .from(tradeScreenshots)
    .where(
      and(
        eq(tradeScreenshots.id, parsed.data.screenshotId),
        eq(tradeScreenshots.tradeId, trade.id),
      ),
    )
    .limit(1);
  if (!screenshot) {
    return { success: false, error: "Screenshot not found" };
  }

  await db
    .delete(tradeScreenshots)
    .where(eq(tradeScreenshots.id, parsed.data.screenshotId));
  await storage.delete(screenshot.storageKey);

  revalidatePath("/journal");
  return { success: true, data: null };
}

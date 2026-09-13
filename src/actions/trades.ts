"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/index";
import { listOwnedAccountIds } from "@/db/queries/accounts";
import { getInstrumentById } from "@/db/queries/instruments";
import {
  countExistingConfluenceTags,
  countExistingMistakeTags,
  getNextLinkSortOrder,
  getOwnedTrade,
} from "@/db/queries/trades";
import {
  tradeAccounts,
  tradeConfluences,
  tradeLinks,
  tradeMistakes,
  tradeScreenshots,
  trades,
} from "@/db/schema/trades";
import { calculatePnl } from "@/domain/pnl";
import { validateTradeAccountAssignment } from "@/domain/trades";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { awardBadgesQuietly } from "@/lib/badges/sync";
import { dollarsToCents } from "@/lib/money";
import { storage } from "@/lib/storage";
import {
  addTradeLinkSchema,
  createTradeSchema,
  deleteTradeLinkSchema,
  deleteTradeScreenshotSchema,
} from "@/schemas/trades";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

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

  // Same "id from the client is untrusted until checked" treatment as
  // instrumentId/accountIds, applied consistently to the two tag join tables.
  const [existingConfluenceTagCount, existingMistakeTagCount] =
    await Promise.all([
      countExistingConfluenceTags(data.confluenceTagIds),
      countExistingMistakeTags(data.mistakeTagIds),
    ]);
  if (existingConfluenceTagCount !== data.confluenceTagIds.length) {
    return { success: false, error: "One or more confluence tags not found" };
  }
  if (existingMistakeTagCount !== data.mistakeTagIds.length) {
    return { success: false, error: "One or more mistake tags not found" };
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

  let pnlCents: number | null = null;
  let rMultiple: number | null = null;
  let points: string | null = null;

  if (data.taken) {
    const result = calculatePnl(
      {
        direction: data.direction,
        entryPrice: data.entryPrice,
        exitPrice: data.exitPrice,
        contracts: data.contracts,
        pointValue: Number(instrument.pointValue),
        stopPrice: data.stopPrice,
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
    points = rawPoints.toFixed(4);
  }

  const createdId = await db.transaction(async (tx) => {
    const [trade] = await tx
      .insert(trades)
      .values({
        userId: user.id,
        tradeDate: data.tradeDate,
        instrumentId: data.instrumentId,
        taken: data.taken,
        contracts: data.taken ? data.contracts : null,
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
      })
      .returning({ id: trades.id });

    if (ownedAccountIds.length > 0) {
      await tx.insert(tradeAccounts).values(
        ownedAccountIds.map((accountId) => ({
          tradeId: trade.id,
          accountId,
        })),
      );
    }
    if (data.confluenceTagIds.length > 0) {
      await tx.insert(tradeConfluences).values(
        data.confluenceTagIds.map((confluenceTagId) => ({
          tradeId: trade.id,
          confluenceTagId,
        })),
      );
    }
    if (data.mistakeTagIds.length > 0) {
      await tx.insert(tradeMistakes).values(
        data.mistakeTagIds.map((mistakeTagId) => ({
          tradeId: trade.id,
          mistakeTagId,
        })),
      );
    }
    if (data.links.length > 0) {
      await tx.insert(tradeLinks).values(
        data.links.map((link, index) => ({
          tradeId: trade.id,
          url: link.url,
          label: link.label ?? null,
          sortOrder: index,
        })),
      );
    }

    return trade.id;
  });

  await awardBadgesQuietly(user.id, user.timezone);

  revalidatePath("/journal");
  return { success: true, data: { id: createdId, pnlCents, rMultiple } };
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

"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db/index";
import { getNextLinkSortOrder, getOwnedTrade } from "@/db/queries/trades";
import { tradeLinks, tradeScreenshots, trades } from "@/db/schema/trades";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { awardBadgesQuietly } from "@/lib/badges/sync";
import { revalidatePage } from "@/lib/i18n/revalidate";
import { storage } from "@/lib/storage";
import { saveTrade } from "@/lib/trades/save";
import {
  addTradeLinkSchema,
  createTradeSchema,
  deleteTradeLinkSchema,
  deleteTradeSchema,
  deleteTradeScreenshotSchema,
  updateTradeSchema,
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

  const user = await getCurrentUser();
  const saved = await saveTrade(user.id, parsed.data);
  if (!saved.success) return saved;

  await awardBadgesQuietly(user.id, user.timezone);

  revalidatePage("/journal");
  revalidatePage("/dashboard");
  return saved;
}

/**
 * Rewrites one existing trade from the same payload the new-trade form sends.
 *
 * `links` is deliberately ignored by the save. On an existing trade the form
 * manages links through addTradeLink/deleteTradeLink as it always has, so
 * replacing them from the payload would delete rows the user never touched in
 * this form — and screenshots, which cannot travel in a Server Action at all,
 * would still be handled separately either way.
 */
export async function updateTrade(input: unknown): Promise<
  ActionResult<{
    id: number;
    pnlCents: number | null;
    rMultiple: number | null;
  }>
> {
  const parsed = updateTradeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await getCurrentUser();
  const saved = await saveTrade(user.id, parsed.data.trade, {
    tradeId: parsed.data.tradeId,
  });
  if (!saved.success) return saved;

  await awardBadgesQuietly(user.id, user.timezone);

  revalidatePage("/journal");
  revalidatePage(`/journal/${saved.data.id}`);
  revalidatePage("/dashboard");
  return saved;
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

  revalidatePage("/journal");
  revalidatePage("/dashboard");
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

  revalidatePage("/journal");
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

  revalidatePage("/journal");
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

  revalidatePage("/journal");
  return { success: true, data: null };
}

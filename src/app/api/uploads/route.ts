import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/db/index";
import {
  countTradeScreenshots,
  getNextScreenshotSortOrder,
  getOwnedTrade,
} from "@/db/queries/trades";
import { tradeScreenshots } from "@/db/schema/trades";
import { canAddScreenshot } from "@/domain/trades";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { storage } from "@/lib/storage";
import {
  createSignedUploadUrl,
  verifySignedUploadUrl,
} from "@/lib/uploads/signed-url";

// The one route-handler exception coding-standards.md carves out beyond cron:
// "screenshot upload and signed-URL issuing". Binary transport only —
// deletion is a Server Action (src/actions/trades.ts, deleteTradeScreenshot),
// since it never touches a file body.

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const tradeIdRaw = formData.get("tradeId");
  const file = formData.get("file");

  const tradeId = Number(tradeIdRaw);
  if (!Number.isInteger(tradeId) || tradeId <= 0) {
    return NextResponse.json({ error: "Invalid tradeId" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File is too large" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const trade = await getOwnedTrade(user.id, tradeId);
  if (!trade) {
    return NextResponse.json({ error: "Trade not found" }, { status: 404 });
  }

  const existingCount = await countTradeScreenshots(tradeId);
  const slotCheck = canAddScreenshot(existingCount);
  if (!slotCheck.success) {
    return NextResponse.json({ error: slotCheck.error }, { status: 400 });
  }

  const storageKey = `screenshots/${user.id}/${tradeId}/${randomUUID()}.jpg`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await storage.put(storageKey, buffer);

  const sortOrder = await getNextScreenshotSortOrder(tradeId);
  const [created] = await db
    .insert(tradeScreenshots)
    .values({ tradeId, storageKey, sortOrder })
    .returning({ id: tradeScreenshots.id });

  revalidatePath("/journal");
  return NextResponse.json({
    id: created.id,
    sortOrder,
    url: createSignedUploadUrl(storageKey),
  });
}

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  const expires = request.nextUrl.searchParams.get("expires");
  const sig = request.nextUrl.searchParams.get("sig");

  if (!key || !expires || !sig || !verifySignedUploadUrl(key, expires, sig)) {
    return NextResponse.json(
      { error: "Invalid or expired URL" },
      { status: 403 },
    );
  }

  // A valid signature proves the URL was issued, not to whom. Keys carry
  // their owner (`screenshots/<userId>/…`, see POST above), so a signed URL
  // passed on to another signed-in user still returns nothing.
  const user = await getCurrentUser();
  if (!key.startsWith(`screenshots/${user.id}/`)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = await storage.get(key);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(data), {
    headers: { "Content-Type": "image/jpeg" },
  });
}

import { asc, inArray } from "drizzle-orm";
import { db } from "../index.ts";
import { confluenceTags, mistakeTags } from "../schema/trades.ts";

// Ordered by id to preserve the seeded group/insertion order.
export async function listConfluenceTags() {
  return db.select().from(confluenceTags).orderBy(asc(confluenceTags.id));
}

export async function listMistakeTags() {
  return db.select().from(mistakeTags).orderBy(asc(mistakeTags.id));
}

export async function countExistingConfluenceTags(
  ids: number[],
): Promise<number> {
  if (ids.length === 0) return 0;
  const rows = await db
    .select({ id: confluenceTags.id })
    .from(confluenceTags)
    .where(inArray(confluenceTags.id, ids));
  return rows.length;
}

export async function countExistingMistakeTags(ids: number[]): Promise<number> {
  if (ids.length === 0) return 0;
  const rows = await db
    .select({ id: mistakeTags.id })
    .from(mistakeTags)
    .where(inArray(mistakeTags.id, ids));
  return rows.length;
}

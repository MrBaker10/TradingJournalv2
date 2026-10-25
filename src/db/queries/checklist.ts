import { and, asc, eq, sql } from "drizzle-orm";
import {
  CHECKLIST_PHASE_FULL,
  type ChecklistItemInput,
  checklistItemSchema,
  MAX_CHECKLIST_ITEMS_PER_PHASE,
} from "../../schemas/checklist.ts";
import { db } from "../index.ts";
import { checklistTemplateItems as items } from "../schema/checklist.ts";

import { users } from "../schema/users.ts";

export class ChecklistError extends Error {}

export type ChecklistItem = typeof items.$inferSelect;

export async function listChecklistItems(
  userId: number,
  executor: Pick<typeof db, "select"> = db,
): Promise<ChecklistItem[]> {
  return executor
    .select()
    .from(items)
    .where(eq(items.userId, userId))
    .orderBy(asc(items.phase), asc(items.position), asc(items.id));
}

export async function createChecklistItem(
  userId: number,
  input: ChecklistItemInput,
  executor: Pick<typeof db, "transaction"> = db,
): Promise<ChecklistItem> {
  const content = checklistItemSchema.parse(input);
  return executor.transaction(async (tx) => {
    // Serialize additions even when the phase is empty, so concurrent requests
    // cannot both claim the last available slot or the same position.
    await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .for("update");
    const [last] = await tx
      .select({
        count: sql<number>`count(*)::int`,
        position: sql<number>`coalesce(max(${items.position}), -1)::int`,
      })
      .from(items)
      .where(and(eq(items.userId, userId), eq(items.phase, content.phase)));
    if (last.count >= MAX_CHECKLIST_ITEMS_PER_PHASE)
      throw new ChecklistError(CHECKLIST_PHASE_FULL);
    const [item] = await tx
      .insert(items)
      .values({ userId, ...content, position: last.position + 1 })
      .returning();
    return item;
  });
}

export async function renameChecklistItem(
  userId: number,
  itemId: number,
  text: string,
  executor: Pick<typeof db, "update"> = db,
): Promise<void> {
  const parsed = checklistItemSchema.shape.text.parse(text);
  const updated = await executor
    .update(items)
    .set({ text: parsed })
    .where(and(eq(items.userId, userId), eq(items.id, itemId)))
    .returning({ id: items.id });
  if (!updated.length) throw new ChecklistError("This step no longer exists.");
}

export async function deleteChecklistItem(
  userId: number,
  itemId: number,
  executor: Pick<typeof db, "delete"> = db,
): Promise<void> {
  const deleted = await executor
    .delete(items)
    .where(and(eq(items.userId, userId), eq(items.id, itemId)))
    .returning({ id: items.id });
  if (!deleted.length) throw new ChecklistError("This step no longer exists.");
}

import { and, asc, eq, sql } from "drizzle-orm";
import {
  CHECKLIST_PHASE_FULL,
  type ChecklistItemInput,
  checklistItemSchema,
  MAX_CHECKLIST_ITEMS_PER_PHASE,
} from "../../schemas/checklist.ts";
import { db } from "../index.ts";
import {
  dailyChecklistChecks as checks,
  checklistTemplateItems as items,
} from "../schema/checklist.ts";
import { users } from "../schema/users.ts";

export class ChecklistError extends Error {}

export type ChecklistItem = typeof items.$inferSelect;

export type DailyChecklistItem = Pick<
  ChecklistItem,
  "id" | "phase" | "text"
> & {
  checked: boolean;
};

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

/** The check of one owned template item on one calendar date. */
function checkOf(userId: number, date: string, itemId: number) {
  return and(
    eq(checks.userId, userId),
    eq(checks.checkDate, date),
    eq(checks.itemId, itemId),
  );
}

/**
 * Locks an owned template item, so a tick and a delete of the same item run
 * one after the other: a tick can neither fail on the foreign key nor leave
 * today's check behind with its reference cleared.
 */
async function lockOwnedItem(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: number,
  itemId: number,
) {
  const [item] = await tx
    .select({ phase: items.phase, text: items.text })
    .from(items)
    .where(and(eq(items.userId, userId), eq(items.id, itemId)))
    .for("update");
  if (!item) throw new ChecklistError("This step no longer exists.");
  return item;
}

/**
 * Deletes an owned template item together with its check on `today`. Checks
 * on earlier dates stay with their copied text and phase; the foreign key
 * clears their reference.
 */
export async function deleteChecklistItem(
  userId: number,
  itemId: number,
  today: string,
  executor: Pick<typeof db, "transaction"> = db,
): Promise<void> {
  await executor.transaction(async (tx) => {
    await lockOwnedItem(tx, userId, itemId);
    await tx.delete(checks).where(checkOf(userId, today, itemId));
    await tx.delete(items).where(eq(items.id, itemId));
  });
}

/**
 * One day's checklist: the current template joined with that day's checks.
 * The date is the user's calendar day, resolved by the caller.
 */
export async function getDailyChecklist(
  userId: number,
  date: string,
  executor: Pick<typeof db, "select"> = db,
): Promise<DailyChecklistItem[]> {
  return executor
    .select({
      id: items.id,
      phase: items.phase,
      text: items.text,
      checked: sql<boolean>`${checks.id} is not null`,
    })
    .from(items)
    .leftJoin(
      checks,
      and(
        eq(checks.itemId, items.id),
        eq(checks.userId, userId),
        eq(checks.checkDate, date),
      ),
    )
    .where(eq(items.userId, userId))
    .orderBy(asc(items.phase), asc(items.position), asc(items.id));
}

/**
 * The checks recorded on one date, with the phase and text they were ticked
 * with — what remains of a past day after its template items changed.
 */
export async function listChecklistChecks(
  userId: number,
  date: string,
  executor: Pick<typeof db, "select"> = db,
): Promise<Pick<ChecklistItem, "phase" | "text">[]> {
  return executor
    .select({ phase: checks.phase, text: checks.text })
    .from(checks)
    .where(and(eq(checks.userId, userId), eq(checks.checkDate, date)))
    .orderBy(asc(checks.phase), asc(checks.checkedAt), asc(checks.id));
}

/** Ticks or unticks an owned template item for one day; repeating is a no-op. */
export async function setChecklistCheck(
  userId: number,
  itemId: number,
  date: string,
  checked: boolean,
  executor: Pick<typeof db, "transaction"> = db,
): Promise<void> {
  await executor.transaction(async (tx) => {
    const item = await lockOwnedItem(tx, userId, itemId);
    if (checked) {
      await tx
        .insert(checks)
        .values({ userId, checkDate: date, itemId, ...item })
        .onConflictDoNothing();
    } else {
      await tx.delete(checks).where(checkOf(userId, date, itemId));
    }
  });
}

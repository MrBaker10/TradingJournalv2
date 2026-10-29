"use server";

import type * as z from "zod";
import {
  createLedgerEntry,
  deleteLedgerEntry,
  LedgerEntryError,
  type LedgerEntryWrite,
  updateLedgerEntry,
} from "@/db/queries/ledger";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { revalidatePage } from "@/lib/i18n/revalidate";
import { exactCents } from "@/lib/money";
import {
  createLedgerEntrySchema,
  deleteLedgerEntrySchema,
  LEDGER_DELETE_FAILED,
  LEDGER_SAVE_FAILED,
  LEDGER_UPDATE_FAILED,
  updateLedgerEntrySchema,
} from "@/schemas/ledger";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * A parsed form entry as the query module writes it. The schema has already
 * refused anything `exactCents` cannot read; a null here is a bug, never a
 * $0 entry.
 */
function toLedgerWrite(
  entry: z.output<typeof createLedgerEntrySchema>,
): LedgerEntryWrite {
  const amountCents = exactCents(entry.amount);
  if (amountCents === null) throw new Error("Unreadable ledger amount");
  return {
    entryDate: entry.entryDate,
    kind: entry.kind,
    category: entry.category,
    amountCents,
    note: entry.note,
    accountId: entry.accountId,
  };
}

/**
 * Records one ledger entry for the current user. Only the ledger page reads
 * entries, so only it is revalidated: no trading figure depends on them
 * (docs/adr/0002).
 */
export async function addLedgerEntry(
  input: unknown,
): Promise<ActionResult<{ id: number }>> {
  const parsed = createLedgerEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const user = await getCurrentUser();
    const created = await createLedgerEntry(
      user.id,
      toLedgerWrite(parsed.data),
    );

    revalidatePage("/ledger");
    return { success: true, data: created };
  } catch (error) {
    if (error instanceof LedgerEntryError)
      return { success: false, error: error.message };
    console.error("Ledger entry save failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { success: false, error: LEDGER_SAVE_FAILED };
  }
}

/** Replaces one of the current user's entries; saved explicitly by the form. */
export async function editLedgerEntry(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = updateLedgerEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const user = await getCurrentUser();
    const { entryId, ...entry } = parsed.data;
    await updateLedgerEntry(user.id, entryId, toLedgerWrite(entry));

    revalidatePage("/ledger");
    return { success: true, data: null };
  } catch (error) {
    if (error instanceof LedgerEntryError)
      return { success: false, error: error.message };
    console.error("Ledger entry update failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { success: false, error: LEDGER_UPDATE_FAILED };
  }
}

/** Deletes one of the current user's entries, after the form's two clicks. */
export async function removeLedgerEntry(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = deleteLedgerEntrySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: LEDGER_DELETE_FAILED };

  try {
    const user = await getCurrentUser();
    await deleteLedgerEntry(user.id, parsed.data.entryId);

    revalidatePage("/ledger");
    return { success: true, data: null };
  } catch (error) {
    if (error instanceof LedgerEntryError)
      return { success: false, error: error.message };
    console.error("Ledger entry delete failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { success: false, error: LEDGER_DELETE_FAILED };
  }
}

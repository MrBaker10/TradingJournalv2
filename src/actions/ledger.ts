"use server";

import { revalidatePath } from "next/cache";
import { createLedgerEntry, LedgerEntryError } from "@/db/queries/ledger";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { exactCents } from "@/lib/money";
import { createLedgerEntrySchema, LEDGER_SAVE_FAILED } from "@/schemas/ledger";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

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
    const entry = parsed.data;
    // The schema has already refused anything `exactCents` cannot read; a
    // null here is a bug, never a $0 entry.
    const amountCents = exactCents(entry.amount);
    if (amountCents === null) throw new Error("Unreadable ledger amount");
    const created = await createLedgerEntry(user.id, {
      entryDate: entry.entryDate,
      kind: entry.kind,
      category: entry.category,
      amountCents,
      note: entry.note,
      accountId: entry.accountId,
    });

    revalidatePath("/ledger");
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

import { desc, eq, sql } from "drizzle-orm";
import {
  type LedgerEntryCheck,
  validateLedgerEntry,
} from "../../domain/ledger.ts";
import { formatCentsPlain } from "../../lib/money.ts";
import { db } from "../index.ts";
import { ledgerEntries } from "../schema/ledger.ts";

// Ledger entries are the user's own real money and stay on the ledger page:
// nothing here is read by trading P&L, the equity curve, the calendar or
// progress (docs/adr/0002). Every query filters by user.

/** A ledger rule the entry broke; the message is meant for the user. */
export class LedgerEntryError extends Error {}

type LedgerEntrySelect = typeof ledgerEntries.$inferSelect;

/**
 * The table's own fields, except that the amount travels as USD cents
 * (`amountCents` from the domain check) instead of the `numeric` string.
 */
export type LedgerEntryWrite = Pick<LedgerEntrySelect, "entryDate" | "note"> &
  LedgerEntryCheck;

export type LedgerEntryRow = Pick<LedgerEntrySelect, "id"> & LedgerEntryWrite;

export async function createLedgerEntry(
  userId: number,
  entry: LedgerEntryWrite,
  executor: Pick<typeof db, "insert"> = db,
): Promise<{ id: number }> {
  const check = validateLedgerEntry(entry);
  if (!check.success) throw new LedgerEntryError(check.error);

  const [created] = await executor
    .insert(ledgerEntries)
    .values({
      userId,
      entryDate: entry.entryDate,
      kind: entry.kind,
      category: entry.category,
      amount: formatCentsPlain(entry.amountCents),
      note: entry.note,
    })
    .returning({ id: ledgerEntries.id });
  return created;
}

/** The user's entries, newest first; on the same date the later-added first. */
export async function listLedgerEntries(
  userId: number,
  executor: Pick<typeof db, "select"> = db,
): Promise<LedgerEntryRow[]> {
  const rows = await executor
    .select({
      id: ledgerEntries.id,
      entryDate: ledgerEntries.entryDate,
      kind: ledgerEntries.kind,
      category: ledgerEntries.category,
      amountCents: sql<string>`(${ledgerEntries.amount} * 100)::bigint`,
      note: ledgerEntries.note,
    })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.userId, userId))
    .orderBy(desc(ledgerEntries.entryDate), desc(ledgerEntries.id));

  return rows.map((row) => ({ ...row, amountCents: Number(row.amountCents) }));
}

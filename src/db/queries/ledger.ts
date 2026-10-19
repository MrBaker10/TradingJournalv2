import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import {
  type LedgerEntryCheck,
  validateLedgerEntry,
} from "../../domain/ledger.ts";
import { formatCentsPlain } from "../../lib/money.ts";
import { db } from "../index.ts";
import { accounts } from "../schema/accounts.ts";
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
export type LedgerEntryWrite = Pick<
  LedgerEntrySelect,
  "entryDate" | "note" | "accountId"
> &
  LedgerEntryCheck;

type AccountSelect = typeof accounts.$inferSelect;

/** An account the entry form offers. */
export type LedgerAccount = Pick<AccountSelect, "id" | "name">;

/** An entry as listed: an archived account keeps its name. */
export type LedgerEntryRow = Pick<LedgerEntrySelect, "id"> &
  LedgerEntryWrite & { accountName: AccountSelect["name"] | null };

/**
 * The accounts a new entry may be tied to: the user's own, real (never
 * practice — docs/adr/0002) and not archived. A client-supplied account id
 * is checked against exactly this rule.
 */
function assignableAccountFilter(userId: number) {
  return and(
    eq(accounts.userId, userId),
    eq(accounts.isPractice, false),
    isNull(accounts.archivedAt),
  );
}

async function isAssignableAccount(
  userId: number,
  accountId: number,
  executor: Pick<typeof db, "select">,
): Promise<boolean> {
  const [account] = await executor
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), assignableAccountFilter(userId)))
    .limit(1);
  return account !== undefined;
}

/** The accounts the entry form offers, in the account selector's order. */
export async function listLedgerAccounts(
  userId: number,
  executor: Pick<typeof db, "select"> = db,
): Promise<LedgerAccount[]> {
  return executor
    .select({ id: accounts.id, name: accounts.name })
    .from(accounts)
    .where(assignableAccountFilter(userId))
    .orderBy(asc(accounts.sortOrder));
}

export async function createLedgerEntry(
  userId: number,
  entry: LedgerEntryWrite,
  executor: Pick<typeof db, "insert" | "select"> = db,
): Promise<{ id: number }> {
  const check = validateLedgerEntry(entry);
  if (!check.success) throw new LedgerEntryError(check.error);
  if (
    entry.accountId !== null &&
    !(await isAssignableAccount(userId, entry.accountId, executor))
  ) {
    throw new LedgerEntryError(
      "Pick one of your active real accounts, or no account.",
    );
  }

  const [created] = await executor
    .insert(ledgerEntries)
    .values({
      userId,
      entryDate: entry.entryDate,
      kind: entry.kind,
      category: entry.category,
      amount: formatCentsPlain(entry.amountCents),
      note: entry.note,
      accountId: entry.accountId,
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
      accountId: ledgerEntries.accountId,
      accountName: accounts.name,
    })
    .from(ledgerEntries)
    .leftJoin(accounts, eq(accounts.id, ledgerEntries.accountId))
    .where(eq(ledgerEntries.userId, userId))
    .orderBy(desc(ledgerEntries.entryDate), desc(ledgerEntries.id));

  return rows.map((row) => ({ ...row, amountCents: Number(row.amountCents) }));
}

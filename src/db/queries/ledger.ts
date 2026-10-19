import {
  and,
  asc,
  desc,
  eq,
  gte,
  isNull,
  lte,
  type SQL,
  sql,
} from "drizzle-orm";
import type { AccountCurrency } from "../../domain/fx.ts";
import {
  type LedgerEntryCheck,
  type LedgerTotalsCents,
  ledgerNetCents,
  validateLedgerEntry,
} from "../../domain/ledger.ts";
import { formatCentsPlain } from "../../lib/money.ts";
import { db } from "../index.ts";
import { accounts } from "../schema/accounts.ts";
import { ledgerEntries } from "../schema/ledger.ts";
import { rateOnSql } from "./fx.ts";
import { type DateRange, toNumber } from "./scope.ts";

// Ledger entries are the user's own real money and stay on the ledger page:
// nothing here is read by trading P&L, the equity curve, the calendar or
// progress (docs/adr/0002). Every query filters by user.

/** A ledger rule the entry broke; the message is meant for the user. */
export class LedgerEntryError extends Error {}

const ACCOUNT_NOT_ASSIGNABLE =
  "Pick one of your active real accounts, or no account.";
const ENTRY_NOT_FOUND = "This entry no longer exists.";

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

/**
 * An entry as listed: an archived account keeps its name. Whether that
 * account is practice lets an edit tell an archived account it may keep from
 * one it may not (null without an account).
 */
export type LedgerEntryRow = Pick<LedgerEntrySelect, "id"> &
  LedgerEntryWrite & {
    accountName: AccountSelect["name"] | null;
    accountIsPractice: AccountSelect["isPractice"] | null;
  };

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

/**
 * The accounts the page's filter offers: the user's real accounts in the
 * selector's order, an archived one only while entries point at it — its
 * history stays reachable, an unused one would only be noise. Practice never:
 * no entry can belong to one (docs/adr/0002).
 */
export async function listLedgerFilterAccounts(
  userId: number,
  executor: Pick<typeof db, "select"> = db,
): Promise<LedgerAccount[]> {
  return executor
    .select({ id: accounts.id, name: accounts.name })
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, userId),
        eq(accounts.isPractice, false),
        sql`(${accounts.archivedAt} is null or exists (
          select 1 from ${ledgerEntries}
          where ${ledgerEntries.userId} = ${userId}
            and ${ledgerEntries.accountId} = ${accounts.id}
        ))`,
      ),
    )
    .orderBy(asc(accounts.sortOrder));
}

/**
 * Records one entry. The account check and the insert share a transaction,
 * and the check holds the account row `for share`: archiving it or switching
 * it to practice waits until the entry is written, so neither can slip in
 * between (the same intent as the statement-level checks in accounts.ts).
 */
export async function createLedgerEntry(
  userId: number,
  entry: LedgerEntryWrite,
  executor: Pick<typeof db, "transaction"> = db,
): Promise<{ id: number }> {
  const check = validateLedgerEntry(entry);
  if (!check.success) throw new LedgerEntryError(check.error);

  return executor.transaction(async (tx) => {
    if (entry.accountId !== null) {
      const [account] = await tx
        .select({ id: accounts.id })
        .from(accounts)
        .where(
          and(
            eq(accounts.id, entry.accountId),
            assignableAccountFilter(userId),
          ),
        )
        .limit(1)
        .for("share");
      if (account === undefined) {
        throw new LedgerEntryError(ACCOUNT_NOT_ASSIGNABLE);
      }
    }

    const [created] = await tx
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
  });
}

/**
 * Replaces an entry's fields in one statement whose `where` holds every rule.
 * The subquery holds the account row `for share`, as createLedgerEntry does,
 * so archiving it or switching it to practice waits for this write. The entry must be the
 * user's — the list joins `accounts` without a user filter and relies on
 * this. The account must be the user's and real; it may be archived only if
 * the entry already has it (an edit must not silently drop it), never as
 * practice. `ledger_entries.account_id` inside the subquery is the row's value
 * before the update.
 */
export async function updateLedgerEntry(
  userId: number,
  entryId: number,
  entry: LedgerEntryWrite,
  executor: Pick<typeof db, "select" | "update"> = db,
): Promise<void> {
  const check = validateLedgerEntry(entry);
  if (!check.success) throw new LedgerEntryError(check.error);

  const owned = and(
    eq(ledgerEntries.id, entryId),
    eq(ledgerEntries.userId, userId),
  );
  const accountAllowed =
    entry.accountId === null
      ? sql`true`
      : sql`exists (
          select 1 from ${accounts}
          where ${accounts.id} = ${entry.accountId}
            and ${accounts.userId} = ${userId}
            and ${accounts.isPractice} = false
            and (${accounts.archivedAt} is null
              or ${ledgerEntries.accountId} = ${entry.accountId})
          for share
        )`;
  const updated = await executor
    .update(ledgerEntries)
    .set({
      entryDate: entry.entryDate,
      kind: entry.kind,
      category: entry.category,
      amount: formatCentsPlain(entry.amountCents),
      note: entry.note,
      accountId: entry.accountId,
      updatedAt: new Date(),
    })
    .where(and(owned, accountAllowed))
    .returning({ id: ledgerEntries.id });
  if (updated.length > 0) return;

  // Nothing matched: say which rule, as deleteUnusedAccount does.
  const [existing] = await executor
    .select({ id: ledgerEntries.id })
    .from(ledgerEntries)
    .where(owned)
    .limit(1);
  throw new LedgerEntryError(
    existing ? ACCOUNT_NOT_ASSIGNABLE : ENTRY_NOT_FOUND,
  );
}

/** Removes one of the user's entries; another user's is never reached. */
export async function deleteLedgerEntry(
  userId: number,
  entryId: number,
  executor: Pick<typeof db, "delete"> = db,
): Promise<void> {
  const deleted = await executor
    .delete(ledgerEntries)
    .where(and(eq(ledgerEntries.id, entryId), eq(ledgerEntries.userId, userId)))
    .returning({ id: ledgerEntries.id });
  if (deleted.length === 0) throw new LedgerEntryError(ENTRY_NOT_FOUND);
}

/**
 * What the ledger page narrows to: one account, a range of entry dates, both
 * or neither. Without an account every entry counts, those without one too.
 */
export type LedgerFilter = DateRange & { accountId?: number };

/** Whether `filter` narrows anything: an empty list then means no match. */
export function isLedgerFilterActive(filter: LedgerFilter): boolean {
  return filter.accountId !== undefined || Boolean(filter.from || filter.to);
}

/**
 * The one condition the list and the totals share, so the figures always
 * match the visible list. The user filter comes first: an account id from the
 * URL can never reach another user's entries.
 */
function ledgerFilterWhere(userId: number, filter: LedgerFilter) {
  const conditions: SQL[] = [eq(ledgerEntries.userId, userId)];
  if (filter.accountId !== undefined) {
    conditions.push(eq(ledgerEntries.accountId, filter.accountId));
  }
  if (filter.from) conditions.push(gte(ledgerEntries.entryDate, filter.from));
  if (filter.to) conditions.push(lte(ledgerEntries.entryDate, filter.to));
  return and(...conditions);
}

/** The user's entries, newest first; on the same date the later-added first. */
export async function listLedgerEntries(
  userId: number,
  filter: LedgerFilter = {},
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
      accountIsPractice: accounts.isPractice,
    })
    .from(ledgerEntries)
    .leftJoin(accounts, eq(accounts.id, ledgerEntries.accountId))
    .where(ledgerFilterWhere(userId, filter))
    .orderBy(desc(ledgerEntries.entryDate), desc(ledgerEntries.id));

  return rows.map((row) => ({ ...row, amountCents: Number(row.amountCents) }));
}

/** The page's three figures, in integer cents of the display currency. */
export type LedgerTotals = LedgerTotalsCents & { netCents: number };

/**
 * One entry's amount in integer cents of the display currency. USD is the
 * amount as entered; any other currency divides by the ECB rate of the entry
 * date and rounds per entry, the same rule as a trade's USD P&L
 * (`tradeDisplayCents`), so the totals are sums of rounded entries.
 */
function entryDisplayCents(currency: AccountCurrency): SQL<number> {
  const usdCents = sql`${ledgerEntries.amount} * 100`;
  if (currency === "USD") return sql<number>`round(${usdCents})`;
  return sql<number>`round(${usdCents} / ${rateOnSql(
    currency,
    sql`${ledgerEntries.entryDate}`,
  )})`;
}

/**
 * Payouts, expenses and the ledger net over the entries `filter` lists, in
 * one statement. The currency is the "All accounts" display currency: the
 * account selector does not scope the ledger (docs/adr/0002).
 */
export async function getLedgerTotals(
  userId: number,
  currency: AccountCurrency,
  filter: LedgerFilter = {},
  executor: Pick<typeof db, "select"> = db,
): Promise<LedgerTotals> {
  const cents = entryDisplayCents(currency);
  const [row] = await executor
    .select({
      payoutsCents: sql<string>`coalesce(sum(${cents}) filter (where ${ledgerEntries.kind} = 'payout'), 0)`,
      expensesCents: sql<string>`coalesce(sum(${cents}) filter (where ${ledgerEntries.kind} = 'expense'), 0)`,
    })
    .from(ledgerEntries)
    .where(ledgerFilterWhere(userId, filter));

  const totals = {
    payoutsCents: toNumber(row.payoutsCents),
    expensesCents: toNumber(row.expensesCents),
  };
  return { ...totals, netCents: ledgerNetCents(totals) };
}

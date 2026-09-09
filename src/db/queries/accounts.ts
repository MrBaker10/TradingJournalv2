import { and, asc, count, eq, inArray, isNull, max } from "drizzle-orm";
import { db } from "../index.ts";
import { accounts } from "../schema/accounts.ts";
import { tradeAccounts } from "../schema/trades.ts";

export async function listAllAccountsForSettings(userId: number) {
  return db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .orderBy(asc(accounts.sortOrder));
}

export async function listActiveAccountsForSwitcher(userId: number) {
  return db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), isNull(accounts.archivedAt)))
    .orderBy(asc(accounts.sortOrder));
}

export async function getOwnedAccount(userId: number, accountId: number) {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1);

  return account;
}

export async function getNextSortOrder(userId: number): Promise<number> {
  const [{ maxSortOrder }] = await db
    .select({ maxSortOrder: max(accounts.sortOrder) })
    .from(accounts)
    .where(eq(accounts.userId, userId));

  return (maxSortOrder ?? -1) + 1;
}

export async function countAssignedTrades(accountId: number): Promise<number> {
  const [row] = await db
    .select({ count: count(tradeAccounts.id) })
    .from(tradeAccounts)
    .where(eq(tradeAccounts.accountId, accountId));

  return row.count;
}

// Never trusts a client-supplied account id list: filters it down to ids
// that belong to this user and are not archived before anything downstream
// treats them as valid.
export async function listOwnedAccountIds(
  userId: number,
  accountIds: number[],
): Promise<number[]> {
  if (accountIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, userId),
        isNull(accounts.archivedAt),
        inArray(accounts.id, accountIds),
      ),
    );

  return rows.map((row) => row.id);
}

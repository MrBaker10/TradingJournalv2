import { and, asc, eq, isNull, max } from "drizzle-orm";
import { db } from "../index.ts";
import { accounts } from "../schema/accounts.ts";

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

// TODO(S4): once trade_accounts exists, this becomes
// `SELECT count(*) FROM trade_accounts WHERE account_id = $1`.
// Always 0 today because no trade can exist yet.
export async function countAssignedTrades(_accountId: number): Promise<number> {
  return 0;
}

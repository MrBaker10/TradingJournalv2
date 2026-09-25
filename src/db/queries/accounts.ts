import {
  and,
  asc,
  count,
  eq,
  getTableColumns,
  inArray,
  isNull,
  max,
  or,
  sql,
} from "drizzle-orm";
import type { AccountCurrency } from "../../domain/fx.ts";
import { db } from "../index.ts";
import { accounts } from "../schema/accounts.ts";
import { tradeAccounts } from "../schema/trades.ts";

/** Any trade assigned to this account — the lock on changing its currency. */
function hasAssignedTrades() {
  return sql`exists (
    select 1 from ${tradeAccounts}
    where ${tradeAccounts.accountId} = ${accounts.id}
  )`;
}

export async function listAllAccountsForSettings(userId: number) {
  return db
    .select({
      ...getTableColumns(accounts),
      hasTrades: hasAssignedTrades().mapWith(Boolean),
    })
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

type AccountWriter = Pick<typeof db, "update">;

/**
 * Sets an owned account's currency, but only while no trade is assigned to
 * it. The lock sits in the statement itself rather than in a count read
 * beforehand, so a trade assigned in between cannot slip through, and the
 * rule is testable against Postgres without importing the server action.
 *
 * Returns false when nothing matched — not owned, or trades assigned.
 */
export async function updateAccountCurrency(
  userId: number,
  accountId: number,
  currency: AccountCurrency,
  executor: AccountWriter = db,
): Promise<boolean> {
  const updated = await executor
    .update(accounts)
    .set({ currency })
    .where(
      and(
        eq(accounts.id, accountId),
        eq(accounts.userId, userId),
        sql`not ${hasAssignedTrades()}`,
      ),
    )
    .returning({ id: accounts.id });

  return updated.length > 0;
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

/**
 * The one account an import writes into, with the currency its file reports
 * in — or null when it is not this user's, or archived. Like
 * `listOwnedAccountIds`, the id from the client is checked, not trusted.
 */
export async function findImportAccount(
  userId: number,
  accountId: number,
): Promise<{ id: number; currency: AccountCurrency } | null> {
  const [row] = await db
    .select({ id: accounts.id, currency: accounts.currency })
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, userId),
        isNull(accounts.archivedAt),
        eq(accounts.id, accountId),
      ),
    )
    .limit(1);

  return row ?? null;
}

export interface AssignableAccount {
  id: number;
  name: string;
  isPractice: boolean;
  isArchived: boolean;
}

/**
 * The accounts an existing trade may be assigned to: every active account,
 * plus any archived account this trade already sits on.
 *
 * The second half is the point. `listOwnedAccountIds` above drops archived
 * accounts, which is right when a trade is created — you should not file a new
 * trade on an account you have retired. On an *edit* the same filter would
 * quietly strip an assignment the user never touched, and a trade with no
 * account left is a state src/domain/trades.ts forbids outright.
 *
 * So the rule is: an archived assignment can be kept, never newly made. Both
 * the edit form (which renders these as options, archived ones marked) and
 * updateTrade (which validates the submitted ids against them) read it from
 * here, so the list the user sees and the list the server accepts cannot
 * drift apart.
 */
export async function listAssignableAccounts(
  userId: number,
  tradeId: number,
): Promise<AssignableAccount[]> {
  const rows = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      isPractice: accounts.isPractice,
      archivedAt: accounts.archivedAt,
    })
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, userId),
        or(
          isNull(accounts.archivedAt),
          sql`exists (
            select 1 from ${tradeAccounts}
            where ${tradeAccounts.accountId} = ${accounts.id}
              and ${tradeAccounts.tradeId} = ${tradeId}
          )`,
        ),
      ),
    )
    .orderBy(asc(accounts.sortOrder));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    isPractice: row.isPractice,
    isArchived: row.archivedAt !== null,
  }));
}

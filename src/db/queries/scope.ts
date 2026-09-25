import { and, eq, gte, lte, type SQL, sql } from "drizzle-orm";
import { type AccountCurrency, displayCurrencyFor } from "../../domain/fx.ts";
import type { IsoDate } from "../../domain/streak.ts";
import { db } from "../index.ts";
import { accounts } from "../schema/accounts.ts";
import { tradeAccounts, trades } from "../schema/trades.ts";
import { hasRealAccount, tradeDisplayCents } from "./trades.ts";

// The account scope every figure in this app is computed inside, in one place
// so no query invents its own. It came out of src/db/queries/dashboard.ts when
// analytics needed the same money multiplier — duplicating it would have been
// two copies of the rule that decides whether P&L is right.
//
// The rules, from project-overview.md and coding-standards.md:
//
// - "All accounts" means all accounts with is_practice = false. The practice
//   filter sits inside realAccountCount and hasRealAccount and runs before
//   anything is summed.
// - A selected account is the only code path allowed to read practice data,
//   and it never multiplies: the per-account value is the figure.
// - A missed setup carries no account at all (src/domain/trades.ts) and no
//   P&L. It is therefore in scope in both modes, and drops out of every money
//   sum on its own because tradePnlCents is NULL for it.
// - Streak, consistency score and badges see real accounts only
//   (project-structure.md), so their queries take no selected account and do
//   not follow the switcher.

export interface QueryScope {
  userId: number;
  /** `users.selected_account_id`. null = "All accounts" = all real accounts. */
  selectedAccountId: number | null;
  /**
   * The currency money figures are shown in (display-currency). A page works
   * it out once with `listScopeCurrencies` and `displayCurrencyFor`; left out
   * it is USD, the currency trades are stored in.
   */
  currency?: AccountCurrency;
}

/**
 * First and last date to include, both inclusive and both optional — an
 * open-ended range is what a user gets by filling in only one of the two date
 * fields. No range at all is the whole history.
 */
export interface DateRange {
  from?: IsoDate;
  to?: IsoDate;
}

// The money multiplier from src/domain/accounts.ts, in SQL because the
// aggregation runs in the database: how many real accounts this trade was
// copy-traded onto. is_practice = false is the first thing it filters.
export const realAccountCount = sql<number>`(
  select count(*)::int
  from ${tradeAccounts}
  join ${accounts} on ${accounts.id} = ${tradeAccounts.accountId}
  where ${accounts.isPractice} = false
    and ${tradeAccounts.tradeId} = ${trades.id}
)`;

export function assignedToAccount(accountId: number): SQL<boolean> {
  return sql<boolean>`exists (
    select 1 from ${tradeAccounts}
    where ${tradeAccounts.tradeId} = ${trades.id}
      and ${tradeAccounts.accountId} = ${accountId}
  )`;
}

/**
 * The rows a figure is allowed to see: this user's entries in the date range,
 * with taken trades narrowed to the selected scope and missed setups always
 * included, since they belong to no account by design.
 *
 * Without a range the whole history is in scope — which is what the analytics
 * page's "All time" preset means. Every month-scoped caller passes one.
 */
export function scopeConditions(scope: QueryScope, range?: DateRange): SQL[] {
  const inScope =
    scope.selectedAccountId === null
      ? hasRealAccount
      : assignedToAccount(scope.selectedAccountId);

  const conditions: SQL[] = [eq(trades.userId, scope.userId)];
  if (range?.from) conditions.push(gte(trades.tradeDate, range.from));
  if (range?.to) conditions.push(lte(trades.tradeDate, range.to));
  conditions.push(sql`(${trades.taken} = false or ${inScope})`);

  return conditions;
}

/** All of `scopeConditions` as one expression, for a query that needs a single `where`. */
export function scopeWhere(scope: QueryScope, range?: DateRange) {
  return and(...scopeConditions(scope, range));
}

/**
 * One trade's contribution to a money figure, in integer cents of the scope's
 * display currency: rounded to cents per trade first, then multiplied, so the
 * rows of a view add up to its total.
 */
export function moneyContribution(scope: QueryScope): SQL<number> {
  const perTrade = tradeDisplayCents(scope.currency);
  return scope.selectedAccountId === null
    ? sql<number>`(${perTrade} * ${realAccountCount})`
    : sql<number>`${perTrade}`;
}

/**
 * How many times this trade lands in a money figure: the denominator that
 * belongs to the numerator above. A copy-trade on three real accounts adds
 * three times to the sum and three to this, so an average stays the average
 * of one execution on one account.
 */
export function moneyWeight(scope: QueryScope): SQL<number> {
  return scope.selectedAccountId === null
    ? sql<number>`${realAccountCount}`
    : sql<number>`1`;
}

export function toNumber(value: unknown): number {
  return Number(value ?? 0);
}

/** Integer cents in, integer cents out — never a fraction of a cent. */
export function ratioCents(totalCents: number, weight: number): number | null {
  return weight > 0 ? Math.round(totalCents / weight) : null;
}

/**
 * The currencies of the accounts a view covers, for `displayCurrencyFor`: the
 * selected account's own — a practice account included, it is the one path
 * allowed to read one — or, for "All accounts", every real account's,
 * archived ones included, the same accounts whose trades and starting
 * balances the combined figures count. Filtered by the user either way.
 */
export async function listScopeCurrencies(
  scope: QueryScope,
  executor: Pick<typeof db, "selectDistinct"> = db,
): Promise<AccountCurrency[]> {
  const rows = await executor
    .selectDistinct({ currency: accounts.currency })
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, scope.userId),
        scope.selectedAccountId === null
          ? eq(accounts.isPractice, false)
          : eq(accounts.id, scope.selectedAccountId),
      ),
    );
  return rows.map((row) => row.currency);
}

/**
 * The scope with its display currency filled in — what a page does once
 * before it reads any money figure, so every figure on it shares one currency.
 */
export async function withDisplayCurrency(
  scope: QueryScope,
): Promise<QueryScope & { currency: AccountCurrency }> {
  return {
    ...scope,
    currency: displayCurrencyFor(await listScopeCurrencies(scope)),
  };
}

import { and, eq, gte, lte, type SQL, sql } from "drizzle-orm";
import { type AccountCurrency, displayCurrencyFor } from "../../domain/fx.ts";
import type { IsoDate } from "../../domain/streak.ts";
import { db } from "../index.ts";
import { accounts } from "../schema/accounts.ts";
import { instruments } from "../schema/instruments.ts";
import { tradeAccounts, trades } from "../schema/trades.ts";
import { profitRate, rateOnTradeDate } from "./fx.ts";

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

/** How many accounts the trade ran on, practice ones included. */
export const allAccountCount = sql<number>`(
  select count(*)::int
  from ${tradeAccounts}
  where ${tradeAccounts.tradeId} = ${trades.id}
)`;

// A trade "belongs" to a real (non-practice) account if at least one of its
// assigned accounts has is_practice = false. Mirrors
// contributesToMoneyAggregate in src/domain/accounts.ts, but as a set
// membership check rather than a money multiplier — this decides
// visibility, not a P&L figure.
export const hasRealAccount = sql<boolean>`exists (
  select 1 from ${tradeAccounts}
  join ${accounts} on ${accounts.id} = ${tradeAccounts.accountId}
  where ${tradeAccounts.tradeId} = ${trades.id} and ${accounts.isPractice} = false
)`;

export function assignedToAccount(accountId: number): SQL<boolean> {
  return sql<boolean>`exists (
    select 1 from ${tradeAccounts}
    where ${tradeAccounts.tradeId} = ${trades.id}
      and ${tradeAccounts.accountId} = ${accountId}
  )`;
}

/**
 * Which trades a query may see, on top of ownership.
 *
 * `"scoped"` is every figure and list: the account switcher decides. With all
 * accounts a taken trade shows when it sits on a real account, so a trade on
 * practice accounts only drops out (the journal surfaces it through the
 * reveal banner); with one account selected, when it is assigned to that
 * account. A **missed setup always shows**: it carries no account at all —
 * `src/domain/trades.ts` only requires one when `taken = true` — so there is
 * nothing to match it against, and Design-v1.md §4.9 calls it an equal entry.
 *
 * `"owner"` is one trade addressed by its own id. The switcher must not reach
 * it: a practice-only trade opened by URL has to render, or
 * project-overview.md's "Nothing disappears silently" would break on the one
 * page that is supposed to show everything.
 */
export type TradeVisibility = "scoped" | "owner";

/**
 * The rows a figure or list is allowed to see: this user's entries in the
 * date range, under the visibility above.
 *
 * Without a range the whole history is in scope — which is what the analytics
 * page's "All time" preset means. Every month-scoped caller passes one.
 *
 * Streak, consistency score and badges pass all accounts whatever the
 * switcher says: they count entries on real accounts and missed setups.
 */
export function scopeConditions(
  scope: QueryScope,
  range?: DateRange,
  visibility: TradeVisibility = "scoped",
): SQL[] {
  const conditions: SQL[] = [eq(trades.userId, scope.userId)];
  if (range?.from) conditions.push(gte(trades.tradeDate, range.from));
  if (range?.to) conditions.push(lte(trades.tradeDate, range.to));
  if (visibility === "owner") return conditions;

  const inScope =
    scope.selectedAccountId === null
      ? hasRealAccount
      : assignedToAccount(scope.selectedAccountId);
  conditions.push(sql`(${trades.taken} = false or ${inScope})`);

  return conditions;
}

/** All of `scopeConditions` as one expression, for a query that needs a single `where`. */
export function scopeWhere(
  scope: QueryScope,
  range?: DateRange,
  visibility?: TradeVisibility,
) {
  return and(...scopeConditions(scope, range, visibility));
}

// Realised P&L in integer cents, mirroring calculatePnl in
// src/domain/pnl.ts: COALESCE the user's override (stored in dollars), else
// derive it from the prices, the instrument's point value and the contract
// count. `floor(x + 0.5)` is exactly what Math.round does inside
// dollarsToCents, so the two agree cent for cent — the parity test in
// __tests__/trades.test.ts pins that against real NUMERIC arithmetic.
//
// NULL wherever there is no realised P&L (a missed setup, a trade without an
// exit): it then drops out of a SUM and out of the winner/loser split instead
// of reading as a flat zero. Needs the instruments join in scope.
//
// Points × point value × quantity is in the instrument's profit currency
// (ftmo-cfd-instruments): USDJPY settles in yen, GER40.cash in euro. It is
// multiplied by that currency's rate on the trade date before the one
// rounding, like `profitRateVsUsd` in calculatePnl. The override is USD and is
// never converted. With no rate stored at all the derived value is NULL and
// drops out rather than counting yen as dollars.
//
// This is the per-trade value, not a figure. Whether it multiplies by the
// assigned real accounts is the caller's decision — see `moneyContribution`.
export const tradePnlCents = sql<number | null>`(
  case
    when ${trades.taken} = false then null
    when ${trades.exitPrice} is null or ${trades.contracts} is null then null
    else floor(
      coalesce(
        ${trades.pnlOverride},
        case when ${trades.direction} = 'long'
          then (${trades.exitPrice} - ${trades.entryPrice})
          else (${trades.entryPrice} - ${trades.exitPrice})
        end * ${instruments.pointValue} * ${trades.contracts}
          * ${profitRate}
      ) * 100 + 0.5
    )
  end
)::bigint`;

/**
 * One trade's realised P&L in the display currency, in integer cents — what
 * every money figure sums once a view is shown in an account currency
 * (decided 2026-09-24/25, display-currency). In USD it **is** `tradePnlCents`.
 *
 * In a foreign currency:
 * - a trade whose file reported its P&L in that currency — `pnl_source` set,
 *   and the account of its import batch kept in it — shows exactly that
 *   amount, the broker's own figure;
 * - anything else (logged by hand, P&L edited by hand, copy-traded from a USD
 *   account) is its USD P&L divided by the rate of its trade date.
 *
 * `round()` on `numeric` rounds half away from zero, the same rule as
 * `toAccountCents` in src/domain/fx.ts, which the parity test in
 * __tests__/display-currency.test.ts pins against real NUMERIC arithmetic.
 * The sign follows `tradePnlCents`, so a winner/loser filter on that stays
 * right in every currency.
 */
export function tradeDisplayCents(
  currency: AccountCurrency = "USD",
): SQL<number | null> {
  if (currency === "USD") return tradePnlCents;
  return sql<number | null>`(
    case
      when ${tradePnlCents} is null then null
      when ${trades.pnlSource} is not null and (
        select a.currency from import_batches b
        join accounts a on a.id = b.account_id
        where b.id = ${trades.importBatchId}
      ) = ${currency}
        then round(${trades.pnlSource} * 100)
      else round(${tradePnlCents} / ${rateOnTradeDate(currency)})
    end
  )::bigint`;
}

// --- Commission (decided 2026-09-28, commissions) -------------------------
// Stored per assignment in USD dollars (`trade_accounts.commission`). A money
// figure is net of it; `tradePnlCents`, R and points stay gross. Null is
// unknown and sums as nothing.
//
// Every sum below adds **per-assignment amounts already rounded** to display
// cents, never rounds a sum. In a foreign currency the two differ by a cent
// now and then, and only this way do the "By account" rows, a row's
// breakdown and the combined figure add up to one another.

/**
 * A USD dollar amount of commission as integer cents of the display currency.
 * Converted with the trade date's rate, like a P&L no file reported in that
 * currency. Commission is whole cents in USD, so USD needs no rounding rule.
 */
export function commissionDisplayCents(
  usdDollars: SQL,
  currency: AccountCurrency = "USD",
): SQL<number> {
  if (currency === "USD") return sql<number>`round(${usdDollars} * 100)`;
  return sql<number>`round(${usdDollars} * 100 / ${rateOnTradeDate(currency)})`;
}

/** The commission of the assignment row in scope, display cents; 0 unknown. */
function assignmentCommissionCents(currency: AccountCurrency): SQL<number> {
  return commissionDisplayCents(
    sql`coalesce(${tradeAccounts.commission}, 0)`,
    currency,
  );
}

/** Σ commission of the trade's real (non-practice) accounts, display cents. */
export function realCommissionCents(
  currency: AccountCurrency = "USD",
): SQL<number> {
  return sql<number>`(
    select coalesce(sum(${assignmentCommissionCents(currency)}), 0)
    from ${tradeAccounts}
    join ${accounts} on ${accounts.id} = ${tradeAccounts.accountId}
    where ${accounts.isPractice} = false
      and ${tradeAccounts.tradeId} = ${trades.id}
  )`;
}

/** What one account paid for the trade, display cents; 0 when unknown. */
export function accountCommissionCents(
  accountId: number,
  currency: AccountCurrency = "USD",
): SQL<number> {
  return sql<number>`coalesce((
    select ${assignmentCommissionCents(currency)}
    from ${tradeAccounts}
    where ${tradeAccounts.tradeId} = ${trades.id}
      and ${tradeAccounts.accountId} = ${accountId}
  ), 0)`;
}

/** Σ commission of every account of the trade, practice ones included. */
export function allCommissionCents(
  currency: AccountCurrency = "USD",
): SQL<number> {
  return sql<number>`(
    select coalesce(sum(${assignmentCommissionCents(currency)}), 0)
    from ${tradeAccounts}
    where ${tradeAccounts.tradeId} = ${trades.id}
  )`;
}

/**
 * One trade's contribution to a money figure, in integer cents of the scope's
 * display currency: rounded to cents per trade first, then multiplied, so the
 * rows of a view add up to its total.
 *
 * **Net of commission** (decided 2026-09-28, commissions): every account pays
 * its own, so the combined figure subtracts what the real accounts paid and a
 * selected account subtracts its own. NULL stays NULL — a trade without a
 * realised P&L drops out, commission or not.
 */
export function moneyContribution(scope: QueryScope): SQL<number> {
  const perTrade = tradeDisplayCents(scope.currency);
  return scope.selectedAccountId === null
    ? sql<number>`(${perTrade} * ${realAccountCount} - ${realCommissionCents(scope.currency)})`
    : sql<number>`(${perTrade} - ${accountCommissionCents(scope.selectedAccountId, scope.currency)})`;
}

/**
 * Winner and loser by the **net** contribution, so a trade that made less
 * than it cost lands with the losers and the win and loss sums stay one sign
 * each. Every money and win-rate split uses these; the execution section,
 * which is about R, keeps the gross sign of `tradePnlCents`.
 */
export function netWinner(scope: QueryScope): SQL<boolean> {
  return sql<boolean>`${moneyContribution(scope)} > 0`;
}

export function netLoser(scope: QueryScope): SQL<boolean> {
  return sql<boolean>`${moneyContribution(scope)} < 0`;
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

/**
 * Row money: one trade's net P&L as a journal row, a day heading and the
 * detail page show it, display cents. Inside an account scope it is exactly
 * `moneyContribution`, so a row matches the figures it adds up to.
 *
 * The one exception: a trade on practice accounts only, reached with all
 * accounts by its own link or through the reveal banner, has no real account
 * to sum over. It shows the sum over the accounts it does have, rather than
 * nothing, while every figure leaves it out.
 */
export function rowMoney(scope: QueryScope): SQL<number | null> {
  return sql<number | null>`(
    ${tradeDisplayCents(scope.currency)} * ${rowMultiplier(scope)}
      - ${rowCommission(scope)}
  )::bigint`;
}

/**
 * The commission `rowMoney` nets out, display cents: the selected account's,
 * or with all accounts the sum over the real ones — over every account of a
 * practice-only trade. The detail page shows it as the breakdown, so gross,
 * commission and net cannot disagree by a rounding.
 */
export function rowCommission(scope: QueryScope): SQL<number> {
  if (scope.selectedAccountId !== null) {
    return accountCommissionCents(scope.selectedAccountId, scope.currency);
  }
  return sql<number>`(
    case when ${realAccountCount} > 0
      then ${realCommissionCents(scope.currency)}
      else ${allCommissionCents(scope.currency)}
    end
  )`;
}

/** How many executions a row's gross stands for: the same accounts as above. */
function rowMultiplier(scope: QueryScope): SQL<number> {
  if (scope.selectedAccountId !== null) return sql<number>`1`;
  return sql<number>`(
    case when ${realAccountCount} > 0
      then ${realAccountCount}
      else greatest(${allAccountCount}, 1)
    end
  )`;
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

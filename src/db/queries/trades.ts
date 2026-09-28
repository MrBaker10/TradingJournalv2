import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  lte,
  max,
  type SQL,
  sql,
} from "drizzle-orm";
import {
  amountToCents,
  type CommissionSource,
  centsToAmount,
  type StoredCommission,
} from "../../domain/commission.ts";
import type { AccountCurrency, RateCurrency } from "../../domain/fx.ts";
import { calculateUsdPnl } from "../../domain/pnl.ts";
import { dollarsToCents } from "../../lib/money.ts";
import { createSignedUploadUrl } from "../../lib/uploads/signed-url.ts";
import { db } from "../index.ts";
import { accounts } from "../schema/accounts.ts";
import { instruments } from "../schema/instruments.ts";
import {
  confluenceTags,
  mistakeTags,
  tradeAccounts,
  tradeConfluences,
  tradeLinks,
  tradeMistakes,
  tradeScreenshots,
  trades,
} from "../schema/trades.ts";
import { rateOnSql } from "./fx.ts";

export const JOURNAL_PAGE_SIZE = 25;

/** Anything that can run a read: the shared client, or a transaction. */
export type ReadExecutor = Pick<typeof db, "select">;

export type JournalSortBy = "date" | "r";
export type JournalSortDir = "asc" | "desc";

export interface JournalFilters {
  userId: number;
  selectedAccountId: number | null;
  /** Display currency of the rows' P&L; USD when left out. */
  currency?: AccountCurrency;
  dateFrom?: string;
  dateTo?: string;
  instrumentId?: number;
  sortBy: JournalSortBy;
  sortDir: JournalSortDir;
  page: number;
}

export interface JournalTradeAccount {
  id: number;
  name: string;
  isPractice: boolean;
  /**
   * What this account paid for the trade, in integer cents of the view's
   * display currency, or null when unknown (commissions).
   */
  commissionCents: number | null;
  commissionSource: CommissionSource | null;
}

export interface JournalTradeScreenshot {
  id: number;
  url: string;
  sortOrder: number;
}

export interface JournalTradeLink {
  id: number;
  url: string;
  label: string | null;
  sortOrder: number;
}

export interface JournalTradeConfluence {
  id: number;
  group: string;
  label: string;
}

export interface JournalTradeMistake {
  id: number;
  label: string;
}

export interface JournalTradeRow {
  id: number;
  tradeDate: string;
  taken: boolean;
  direction: "long" | "short";
  instrumentId: number;
  instrumentSymbol: string;
  instrumentName: string;
  pointValue: number;
  session: string | null;
  setupType: string | null;
  entryModel: string | null;
  result: string | null;
  grade: string | null;
  felt: string | null;
  byTheBook: boolean | null;
  notes: string | null;
  contracts: number | null;
  entryTime: string;
  exitTime: string | null;
  entryPrice: number;
  exitPrice: number | null;
  stopPrice: number | null;
  mfeR: number | null;
  maeR: number | null;
  postExitMfeR: number | null;
  /** Entry to exit on the chart clock, overnight-aware; null without an exit. */
  holdMinutes: number | null;
  /**
   * The user's manual override in dollars, as stored — not the derived P&L.
   * `pnlCents` below is the figure to render; this one exists so the edit form
   * can put back exactly what was typed.
   */
  pnlOverride: number | null;
  /**
   * The P&L is still the one an import file reported (`pnl_source` set), so
   * the commission is already inside it (commissions).
   */
  pnlFromFile: boolean;
  /**
   * The date of the ECB rate an import converted this trade's P&L with, or
   * null. Whether that rate is still provisional needs the stored rates —
   * `getProvisionalFxRate` in fx.ts answers it for the detail page.
   */
  fxRateDate: string | null;
  /** The realised P&L in USD cents — the stored currency, which R is read from. */
  pnlCents: number | null;
  /**
   * The trade's **net** P&L in the view's display currency, from the same SQL
   * expression the money figures sum (`tradeNetDisplayCents`), so a row
   * matches its total: with an account selected, that account's gross minus
   * its commission; with all accounts, the sum over the real accounts it ran
   * on (decided 2026-09-28, commissions).
   */
  displayPnlCents: number | null;
  /** One execution's gross P&L in the display currency, before commission. */
  displayGrossPnlCents: number | null;
  /**
   * The commission `displayPnlCents` has taken off, display cents — from the
   * same expression, so gross = net + this, to the cent.
   */
  displayCommissionCents: number;
  rMultiple: number | null;
  accounts: JournalTradeAccount[];
  confluences: JournalTradeConfluence[];
  mistakes: JournalTradeMistake[];
  screenshots: JournalTradeScreenshot[];
  links: JournalTradeLink[];
}

export interface JournalHiddenPracticeCount {
  accountId: number;
  accountName: string;
  count: number;
}

export interface JournalTradesResult {
  rows: JournalTradeRow[];
  totalCount: number;
  hiddenPracticeCounts: JournalHiddenPracticeCount[];
}

// A trade "belongs" to a real (non-practice) account if at least one of its
// assigned accounts has is_practice = false. Mirrors
// contributesToMoneyAggregate in src/domain/accounts.ts, but as a set
// membership check rather than a money multiplier — this decides list
// visibility, not a P&L figure.
export const hasRealAccount = sql<boolean>`exists (
  select 1 from ${tradeAccounts}
  join ${accounts} on ${accounts.id} = ${tradeAccounts.accountId}
  where ${tradeAccounts.tradeId} = ${trades.id} and ${accounts.isPractice} = false
)`;

/**
 * Visibility of one trade while a single account is selected.
 *
 * A taken trade shows when it is assigned to that account. A **missed setup
 * always shows**: it carries no account at all — `src/domain/trades.ts` only
 * requires one when `taken = true` — so there is nothing to match it against,
 * and Design.md §4.9 calls it an equal entry, not a lesser kind.
 *
 * This used to be an inner join on `trade_accounts`, which silently dropped
 * every missed setup the moment an account was selected. The "all accounts"
 * branch had the rule right; this one had forgotten it. Found in review.
 */
export function isVisibleForAccount(accountId: number) {
  return sql<boolean>`(${trades.taken} = false or exists (
    select 1 from ${tradeAccounts}
    where ${tradeAccounts.tradeId} = ${trades.id}
      and ${tradeAccounts.accountId} = ${accountId}
  ))`;
}

// One JSON array of the accounts a trade is assigned to, built with a
// correlated subquery so the outer query still returns one row per trade —
// no GROUP BY, no separate round trip per row. The commission comes along in
// the display currency, converted like the money figures convert it.
function accountsJson(currency: AccountCurrency = "USD") {
  return sql<JournalTradeAccount[]>`(
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', ${accounts.id},
          'name', ${accounts.name},
          'isPractice', ${accounts.isPractice},
          'commissionCents', case when ${tradeAccounts.commission} is null
            then null
            else ${commissionDisplayCents(sql`${tradeAccounts.commission}`, currency)}
          end,
          'commissionSource', ${tradeAccounts.commissionSource}
        )
        order by ${accounts.sortOrder}
      ),
      '[]'::jsonb
    )
    from ${tradeAccounts}
    join ${accounts} on ${accounts.id} = ${tradeAccounts.accountId}
    where ${tradeAccounts.tradeId} = ${trades.id}
  )`;
}

// Same correlated-subquery shape as accountsJson, for the same reason: one
// row per trade, no GROUP BY, no round trip per row. Ordered by tag id so the
// badges land in seed order — the order the new-trade form offers them in.
const confluencesJson = sql<JournalTradeConfluence[]>`(
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ${confluenceTags.id},
        'group', ${confluenceTags.group},
        'label', ${confluenceTags.label}
      )
      order by ${confluenceTags.id}
    ),
    '[]'::jsonb
  )
  from ${tradeConfluences}
  join ${confluenceTags} on ${confluenceTags.id} = ${tradeConfluences.confluenceTagId}
  where ${tradeConfluences.tradeId} = ${trades.id}
)`;

const mistakesJson = sql<JournalTradeMistake[]>`(
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ${mistakeTags.id},
        'label', ${mistakeTags.label}
      )
      order by ${mistakeTags.id}
    ),
    '[]'::jsonb
  )
  from ${tradeMistakes}
  join ${mistakeTags} on ${mistakeTags.id} = ${tradeMistakes.mistakeTagId}
  where ${tradeMistakes.tradeId} = ${trades.id}
)`;

// Raw storage keys, not signed URLs — signing happens per-row in TypeScript
// after the query runs (createSignedUploadUrl needs a fresh timestamp per
// issue, not something SQL should do).
const screenshotsJson = sql<
  { id: number; storageKey: string; sortOrder: number }[]
>`(
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ${tradeScreenshots.id},
        'storageKey', ${tradeScreenshots.storageKey},
        'sortOrder', ${tradeScreenshots.sortOrder}
      )
      order by ${tradeScreenshots.sortOrder}
    ),
    '[]'::jsonb
  )
  from ${tradeScreenshots}
  where ${tradeScreenshots.tradeId} = ${trades.id}
)`;

const linksJson = sql<JournalTradeLink[]>`(
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ${tradeLinks.id},
        'url', ${tradeLinks.url},
        'label', ${tradeLinks.label},
        'sortOrder', ${tradeLinks.sortOrder}
      )
      order by ${tradeLinks.sortOrder}
    ),
    '[]'::jsonb
  )
  from ${tradeLinks}
  where ${tradeLinks.tradeId} = ${trades.id}
)`;

/**
 * Minutes between entry and exit, on the user's chart clock.
 *
 * `entry_time` and `exit_time` are `time without time zone` and stay
 * unconverted (coding-standards.md, Time): this subtracts two clock readings,
 * it does not apply a zone to either.
 *
 * An exit **before** the entry is an overnight trade — futures run nearly
 * around the clock, so 22:30 to 01:15 is 2h45 and not a negative duration.
 * There is no exit date to check this against; `trades` carries one
 * `trade_date`, so "earlier on the clock" is the only signal there is.
 *
 * Shared by the analytics hold-time figures and the trade detail page, so the
 * overnight rule lives in one place.
 */
export const holdMinutes = sql<string | null>`(
  case
    when ${trades.exitTime} is null then null
    else extract(epoch from (
      case
        when ${trades.exitTime} < ${trades.entryTime}
          then (${trades.exitTime} - ${trades.entryTime}) + interval '24 hours'
        else (${trades.exitTime} - ${trades.entryTime})
      end
    )) / 60
  end
)`;

// 1 for an instrument that settles in USD, else the rate of its profit
// currency on the trade date. Needs the instruments join in scope.
const profitRate = sql`(
  case when ${instruments.profitCurrency} = 'USD' then 1
    else ${rateOn(sql`${instruments.profitCurrency}`)}
  end
)`;

// Sort key for "R-Multiple": for a taken trade this mirrors calculatePnl in
// src/domain/pnl.ts exactly (COALESCE the override, else derive from prices),
// simplified to a plain dollar ratio since dividing by cents or by dollars
// gives the same R — no cents scaling needed for a sort key. For a missed
// setup there is no exit, so it sorts by the same "would-be" mfe_r value the
// row displays (Design.md §4.9). Both sides are in USD: the override is, and
// the prices and the risk are converted from the profit currency — an FTMO
// import always carries a USD override, so a yen risk would make R a ratio of
// two currencies. Rendering itself never uses this expression;
// it stays SQL-only for ORDER BY, tested against pnl.ts in
// __tests__/trades.test.ts.
export const rMultipleSortKey = sql<number | null>`(
  case
    when ${trades.taken} = false then ${trades.mfeR}
    when ${trades.stopPrice} is null then null
    else (
      coalesce(
        ${trades.pnlOverride},
        case when ${trades.direction} = 'long'
          then (${trades.exitPrice} - ${trades.entryPrice})
          else (${trades.entryPrice} - ${trades.exitPrice})
        end * ${instruments.pointValue} * ${trades.contracts}
          * ${profitRate}
      )
      / nullif(
          abs(${trades.entryPrice} - ${trades.stopPrice}) *
            ${instruments.pointValue} * ${trades.contracts}
            * ${profitRate},
          0
        )
    )
  end
)`;

/**
 * The same rate as text for calculatePnl's `profitRateVsUsd`, NULL for an
 * instrument that settles in USD — so a row computed in TypeScript converts
 * with exactly the rate `tradePnlCents` used. Needs the instruments join.
 */
export const profitRateText = sql<string | null>`(
  case when ${instruments.profitCurrency} = 'USD' then null
    else ${rateOn(sql`${instruments.profitCurrency}`)}::text
  end
)`;

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
// assigned real accounts is the caller's decision — see
// src/db/queries/dashboard.ts.
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
 * The rate a conversion uses for this trade: `rateOnSql` on its trade date.
 * `job:fx` and saving a trade keep the table filled.
 */
function rateOn(currency: RateCurrency | SQL): SQL {
  return rateOnSql(currency, sql`${trades.tradeDate}`);
}

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
      else round(${tradePnlCents} / ${rateOn(currency)})
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
  return sql<number>`round(${usdDollars} * 100 / ${rateOn(currency)})`;
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
function allCommissionCents(currency: AccountCurrency): SQL<number> {
  return sql<number>`(
    select coalesce(sum(${assignmentCommissionCents(currency)}), 0)
    from ${tradeAccounts}
    where ${tradeAccounts.tradeId} = ${trades.id}
  )`;
}

// How many accounts of each kind the trade ran on. Spelled out here rather
// than taken from scope.ts, which imports this file.
const realAssignmentCount = sql<number>`(
  select count(*)::int
  from ${tradeAccounts}
  join ${accounts} on ${accounts.id} = ${tradeAccounts.accountId}
  where ${accounts.isPractice} = false
    and ${tradeAccounts.tradeId} = ${trades.id}
)`;

const allAssignmentCount = sql<number>`(
  select count(*)::int
  from ${tradeAccounts}
  where ${tradeAccounts.tradeId} = ${trades.id}
)`;

/**
 * The commission a row nets out, display cents: the selected account's, or
 * with all accounts the sum over the real ones — over every account of a
 * trade that ran on practice accounts only. `tradeNetDisplayCents` subtracts
 * exactly this, and the detail page shows it as the breakdown, so the two
 * cannot disagree by a rounding.
 */
export function tradeCommissionDisplayCents(
  selectedAccountId: number | null,
  currency: AccountCurrency = "USD",
): SQL<number> {
  if (selectedAccountId !== null) {
    return accountCommissionCents(selectedAccountId, currency);
  }
  return sql<number>`(
    case when ${realAssignmentCount} > 0
      then ${realCommissionCents(currency)}
      else ${allCommissionCents(currency)}
    end
  )`;
}

/** How many executions a row's gross stands for: the same accounts as above. */
function tradeAccountMultiplier(selectedAccountId: number | null): SQL<number> {
  if (selectedAccountId !== null) return sql<number>`1`;
  return sql<number>`(
    case when ${realAssignmentCount} > 0
      then ${realAssignmentCount}
      else greatest(${allAssignmentCount}, 1)
    end
  )`;
}

/**
 * One trade's net P&L as a row shows it, display cents — the same number the
 * money figures add up for it, so a row matches its total.
 *
 * With an account selected: that account's gross minus its commission. With
 * all accounts: the sum over the real accounts it ran on. A trade on practice
 * accounts only (reachable by id, or through the reveal banner) has no real
 * account to sum over; it shows the sum over the accounts it does have.
 */
export function tradeNetDisplayCents(
  selectedAccountId: number | null,
  currency: AccountCurrency = "USD",
): SQL<number | null> {
  return sql<number | null>`(
    ${tradeDisplayCents(currency)} * ${tradeAccountMultiplier(selectedAccountId)}
      - ${tradeCommissionDisplayCents(selectedAccountId, currency)}
  )::bigint`;
}

// Ownership is not in here: queryTradeRows applies it to every caller, so it
// can't be forgotten by a new one.
function buildFilterConditions(filters: JournalFilters): SQL[] {
  const conditions: SQL[] = [];
  if (filters.dateFrom) {
    conditions.push(gte(trades.tradeDate, filters.dateFrom));
  }
  if (filters.dateTo) {
    conditions.push(lte(trades.tradeDate, filters.dateTo));
  }
  if (filters.instrumentId !== undefined) {
    conditions.push(eq(trades.instrumentId, filters.instrumentId));
  }
  return conditions;
}

function buildOrderBy(filters: JournalFilters) {
  const direction = filters.sortDir === "asc" ? sql`asc` : sql`desc`;
  const key =
    filters.sortBy === "r" ? rMultipleSortKey : sql`${trades.tradeDate}`;
  // NULLS LAST regardless of direction: trades without a computed value (no
  // stop price, no exit yet) sort to the bottom instead of jumping to the top
  // on a descending sort, which is Postgres's default for DESC.
  return [sql`${key} ${direction} nulls last`, desc(trades.id)];
}

/**
 * Which trades a query may see, on top of the ownership filter.
 *
 * `"scoped"` is the list view: the account switcher decides, and with "all
 * accounts" a trade that lives only on practice accounts drops out (it comes
 * back through the reveal banner).
 *
 * `"owner"` is one trade addressed by its own id. The switcher must not reach
 * it: a practice-only trade opened by URL has to render, or
 * project-overview.md's "Nothing disappears silently" would break on the one
 * page that is supposed to show everything.
 */
type TradeVisibility = "scoped" | "owner";

interface TradeRowsQuery {
  userId: number;
  /**
   * Which connection to read through. Defaults to the shared client; a test
   * passes its own transaction so the fixture rows it just inserted are
   * visible and can be rolled back afterwards. Same affordance the import
   * queries already carry.
   */
  executor?: ReadExecutor;
  selectedAccountId: number | null;
  /** The display currency `displayPnlCents` is in; USD when left out. */
  currency?: AccountCurrency;
  visibility: TradeVisibility;
  /** Extra filters on top of the ownership and visibility conditions. */
  conditions: SQL[];
  orderBy: SQL[];
  limit: number;
  offset?: number;
}

// The one place that reads a trade row and shapes it for §4.9 rendering.
// Both the journal list and the dashboard's "Recent trades" go through it,
// so the two can't drift apart.
//
// The window count comes along for either caller: Postgres computes it from
// the rows it has to filter anyway, and one select shape is worth more here
// than saving that aggregate on the dashboard.
async function queryTradeRows(
  input: TradeRowsQuery,
): Promise<{ rows: JournalTradeRow[]; totalCount: number }> {
  const baseQuery = (input.executor ?? db)
    .select({
      id: trades.id,
      tradeDate: trades.tradeDate,
      taken: trades.taken,
      direction: trades.direction,
      instrumentId: trades.instrumentId,
      instrumentSymbol: instruments.symbol,
      instrumentName: instruments.name,
      pointValue: instruments.pointValue,
      profitCurrency: instruments.profitCurrency,
      profitRateVsUsd: profitRateText,
      session: trades.session,
      setupType: trades.setupType,
      entryModel: trades.entryModel,
      result: trades.result,
      grade: trades.grade,
      felt: trades.felt,
      byTheBook: trades.byTheBook,
      notes: trades.notes,
      contracts: trades.contracts,
      entryTime: trades.entryTime,
      exitTime: trades.exitTime,
      entryPrice: trades.entryPrice,
      exitPrice: trades.exitPrice,
      stopPrice: trades.stopPrice,
      mfeR: trades.mfeR,
      maeR: trades.maeR,
      postExitMfeR: trades.postExitMfeR,
      holdMinutes,
      pnlOverride: trades.pnlOverride,
      pnlFromFile: sql<boolean>`(${trades.pnlSource} is not null)`,
      fxRateDate: trades.fxRateDate,
      displayPnlCents: tradeNetDisplayCents(
        input.selectedAccountId,
        input.currency,
      ),
      displayGrossPnlCents: tradeDisplayCents(input.currency),
      displayCommissionCents: tradeCommissionDisplayCents(
        input.selectedAccountId,
        input.currency,
      ),
      accounts: accountsJson(input.currency),
      confluences: confluencesJson,
      mistakes: mistakesJson,
      screenshots: screenshotsJson,
      links: linksJson,
      totalCount: sql<number>`(count(*) over())::int`,
    })
    .from(trades)
    .innerJoin(instruments, eq(trades.instrumentId, instruments.id));

  const ownership = eq(trades.userId, input.userId);

  function visibilityCondition(): SQL | undefined {
    if (input.visibility === "owner") return undefined;
    if (input.selectedAccountId === null) {
      return sql`(${trades.taken} = false or (${trades.taken} = true and ${hasRealAccount}))`;
    }
    return isVisibleForAccount(input.selectedAccountId);
  }

  const query = baseQuery.where(
    and(ownership, ...input.conditions, visibilityCondition()),
  );

  const rawRows = await query
    .orderBy(...input.orderBy)
    .limit(input.limit)
    .offset(input.offset ?? 0);

  const totalCount = rawRows[0]?.totalCount ?? 0;

  const rows: JournalTradeRow[] = rawRows.map((row) => {
    const pointValue = Number(row.pointValue);
    const entryPrice = Number(row.entryPrice);
    const exitPrice = row.exitPrice !== null ? Number(row.exitPrice) : null;
    const stopPrice = row.stopPrice !== null ? Number(row.stopPrice) : null;
    const contracts = row.contracts !== null ? Number(row.contracts) : null;

    let pnlCents: number | null = null;
    let rMultiple: number | null = null;
    if (row.taken && exitPrice !== null && contracts !== null) {
      const result = calculateUsdPnl(
        {
          direction: row.direction as "long" | "short",
          entryPrice,
          exitPrice,
          contracts,
          pointValue,
          stopPrice: stopPrice ?? undefined,
          profitCurrency: row.profitCurrency,
          profitRateVsUsd: row.profitRateVsUsd,
        },
        row.pnlOverride !== null
          ? dollarsToCents(Number(row.pnlOverride))
          : undefined,
      );
      pnlCents = result.pnlCents;
      rMultiple = result.rMultiple;
    }

    return {
      id: row.id,
      tradeDate: row.tradeDate,
      taken: row.taken,
      direction: row.direction as "long" | "short",
      instrumentId: row.instrumentId,
      instrumentSymbol: row.instrumentSymbol,
      instrumentName: row.instrumentName,
      pointValue,
      session: row.session,
      setupType: row.setupType,
      entryModel: row.entryModel,
      result: row.result,
      grade: row.grade,
      felt: row.felt,
      byTheBook: row.byTheBook,
      notes: row.notes,
      contracts,
      entryTime: row.entryTime,
      exitTime: row.exitTime,
      entryPrice,
      exitPrice,
      stopPrice,
      mfeR: row.mfeR !== null ? Number(row.mfeR) : null,
      maeR: row.maeR !== null ? Number(row.maeR) : null,
      postExitMfeR: row.postExitMfeR !== null ? Number(row.postExitMfeR) : null,
      holdMinutes: row.holdMinutes !== null ? Number(row.holdMinutes) : null,
      pnlOverride: row.pnlOverride !== null ? Number(row.pnlOverride) : null,
      pnlFromFile: row.pnlFromFile,
      fxRateDate: row.fxRateDate,
      pnlCents,
      displayPnlCents:
        row.displayPnlCents === null ? null : Number(row.displayPnlCents),
      displayGrossPnlCents:
        row.displayGrossPnlCents === null
          ? null
          : Number(row.displayGrossPnlCents),
      // Null only where no rate is stored for a foreign display currency.
      displayCommissionCents: Number(row.displayCommissionCents ?? 0),
      rMultiple: row.taken
        ? rMultiple
        : row.mfeR !== null
          ? Number(row.mfeR)
          : null,
      accounts: row.accounts,
      confluences: row.confluences,
      mistakes: row.mistakes,
      screenshots: row.screenshots.map((screenshot) => ({
        id: screenshot.id,
        url: createSignedUploadUrl(screenshot.storageKey),
        sortOrder: screenshot.sortOrder,
      })),
      links: row.links,
    };
  });

  return { rows, totalCount };
}

export async function listJournalTrades(
  filters: JournalFilters,
  executor: ReadExecutor = db,
): Promise<JournalTradesResult> {
  const { rows, totalCount } = await queryTradeRows({
    userId: filters.userId,
    selectedAccountId: filters.selectedAccountId,
    currency: filters.currency,
    visibility: "scoped",
    executor,
    conditions: buildFilterConditions(filters),
    orderBy: buildOrderBy(filters),
    limit: JOURNAL_PAGE_SIZE,
    offset: (filters.page - 1) * JOURNAL_PAGE_SIZE,
  });

  const hiddenPracticeCounts =
    filters.selectedAccountId === null
      ? await listHiddenPracticeCounts(filters.userId, executor)
      : [];

  return { rows, totalCount, hiddenPracticeCounts };
}

// Design.md §4.8/§4.9: the dashboard's "Recent trades" is the same row as the
// journal list, newest first, so it reuses both the query and the component.
// Missed setups belong here too — they are equal entries, not a lesser kind.
export async function listRecentTrades(
  userId: number,
  selectedAccountId: number | null,
  limit: number,
  currency?: AccountCurrency,
): Promise<JournalTradeRow[]> {
  const { rows } = await queryTradeRows({
    userId,
    selectedAccountId,
    currency,
    visibility: "scoped",
    conditions: [],
    orderBy: [desc(trades.tradeDate), desc(trades.id)],
    limit,
  });

  return rows;
}

/**
 * One trade by its id, in the same shape the list renders.
 *
 * Deliberately through `queryTradeRows` rather than a query of its own: the
 * detail page and the journal row show the same numbers, and two selects would
 * eventually disagree about one of them.
 *
 * `visibility: "owner"` — the account switcher has no say here. Ownership is
 * still the only thing that decides, and a foreign id returns null rather than
 * an error, so the caller's `notFound()` covers both "gone" and "not yours"
 * without telling them apart.
 */
export async function getJournalTradeById(
  userId: number,
  tradeId: number,
  options: {
    /** A test's transaction; the shared client otherwise. */
    executor?: ReadExecutor;
    /** The display currency of `displayPnlCents`; USD when left out. */
    currency?: AccountCurrency;
  } = {},
): Promise<JournalTradeRow | null> {
  const { executor = db, currency } = options;
  const { rows } = await queryTradeRows({
    userId,
    selectedAccountId: null,
    currency,
    visibility: "owner",
    executor,
    conditions: [eq(trades.id, tradeId)],
    orderBy: [desc(trades.id)],
    limit: 1,
  });

  return rows[0] ?? null;
}

// Trades that are taken but assigned only to practice accounts — hidden from
// the combined list, surfaced only as this counter (project-overview.md:
// "nothing disappears silently"). A copy-traded trade assigned to several
// practice accounts is counted once per account, since this is an
// informational count, not a money aggregate — no multiplier applies.
async function listHiddenPracticeCounts(
  userId: number,
  executor: ReadExecutor = db,
): Promise<JournalHiddenPracticeCount[]> {
  return executor
    .select({
      accountId: accounts.id,
      accountName: accounts.name,
      count: sql<number>`count(*)::int`,
    })
    .from(trades)
    .innerJoin(tradeAccounts, eq(tradeAccounts.tradeId, trades.id))
    .innerJoin(accounts, eq(accounts.id, tradeAccounts.accountId))
    .where(
      and(
        eq(trades.userId, userId),
        eq(trades.taken, true),
        eq(accounts.isPractice, true),
        sql`not ${hasRealAccount}`,
      ),
    )
    .groupBy(accounts.id, accounts.name);
}

// Ordered by id to preserve the seeded group/insertion order.
export async function listConfluenceTags() {
  return db.select().from(confluenceTags).orderBy(asc(confluenceTags.id));
}

export async function listMistakeTags() {
  return db.select().from(mistakeTags).orderBy(asc(mistakeTags.id));
}

export interface ConfluenceTagGroup {
  group: string;
  tags: { id: number; label: string }[];
}

// The tag picker wants the six groups, not 58 flat rows. Both the new-trade
// page and the edit page need exactly this, so the folding lives here rather
// than being written out twice.
export async function listConfluenceGroups(): Promise<ConfluenceTagGroup[]> {
  const tags = await listConfluenceTags();

  const grouped = new Map<string, { id: number; label: string }[]>();
  for (const tag of tags) {
    const existing = grouped.get(tag.group) ?? [];
    existing.push({ id: tag.id, label: tag.label });
    grouped.set(tag.group, existing);
  }

  return [...grouped].map(([group, groupTags]) => ({
    group,
    tags: groupTags,
  }));
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Every column of a trade a write sets, assembled by the caller. */
export type TradeWriteColumns = Omit<
  typeof trades.$inferInsert,
  "id" | "userId" | "createdAt" | "updatedAt"
>;

export interface TradeRelationIds {
  accountIds: number[];
  /**
   * What each account pays for the trade, from `commissionOnSave`. An account
   * missing from the map is written with no commission.
   */
  accountCommissions?: Map<number, StoredCommission | null>;
  confluenceTagIds: number[];
  mistakeTagIds: number[];
}

async function insertRelations(
  tx: Tx,
  tradeId: number,
  relations: TradeRelationIds,
): Promise<void> {
  if (relations.accountIds.length > 0) {
    await tx.insert(tradeAccounts).values(
      relations.accountIds.map((accountId) => {
        const commission = relations.accountCommissions?.get(accountId) ?? null;
        return {
          tradeId,
          accountId,
          commission:
            commission === null ? null : centsToAmount(commission.cents),
          commissionSource: commission?.source ?? null,
        };
      }),
    );
  }
  if (relations.confluenceTagIds.length > 0) {
    await tx.insert(tradeConfluences).values(
      relations.confluenceTagIds.map((confluenceTagId) => ({
        tradeId,
        confluenceTagId,
      })),
    );
  }
  if (relations.mistakeTagIds.length > 0) {
    await tx.insert(tradeMistakes).values(
      relations.mistakeTagIds.map((mistakeTagId) => ({
        tradeId,
        mistakeTagId,
      })),
    );
  }
}

/**
 * Writes a new trade with its accounts, tags and links.
 *
 * Takes the transaction rather than opening one: the caller owns the
 * boundary, which is also what lets a test run this against real Postgres and
 * roll the whole thing back.
 */
export async function insertTradeWithRelations(
  tx: Tx,
  userId: number,
  columns: TradeWriteColumns,
  relations: TradeRelationIds,
  links: { url: string; label?: string }[],
): Promise<number> {
  const [trade] = await tx
    .insert(trades)
    .values({ userId, ...columns })
    .returning({ id: trades.id });

  await insertRelations(tx, trade.id, relations);

  if (links.length > 0) {
    await tx.insert(tradeLinks).values(
      links.map((link, index) => ({
        tradeId: trade.id,
        url: link.url,
        label: link.label ?? null,
        sortOrder: index,
      })),
    );
  }

  return trade.id;
}

/**
 * Rewrites an existing trade and **replaces** its accounts and tags.
 *
 * Delete-then-insert, not a merge: a tag the user unticked has to disappear,
 * and nothing else says that. All columns are written for the same reason —
 * flipping an entry to a missed setup must clear the exit, the contracts, the
 * result and the override rather than leave them behind a `taken = false`.
 *
 * `updated_at` is set by hand because the column carries a DEFAULT, not an ON
 * UPDATE trigger. Links and screenshots are not touched here: on an existing
 * trade both are managed row by row while the form is open.
 */
export async function replaceTradeWithRelations(
  tx: Tx,
  tradeId: number,
  columns: TradeWriteColumns,
  relations: TradeRelationIds,
): Promise<void> {
  await tx
    .update(trades)
    .set({ ...columns, updatedAt: new Date() })
    .where(eq(trades.id, tradeId));

  await tx.delete(tradeAccounts).where(eq(tradeAccounts.tradeId, tradeId));
  await tx
    .delete(tradeConfluences)
    .where(eq(tradeConfluences.tradeId, tradeId));
  await tx.delete(tradeMistakes).where(eq(tradeMistakes.tradeId, tradeId));

  await insertRelations(tx, tradeId, relations);
}

/**
 * What each account of a trade pays before an edit, in USD cents. The caller
 * has already checked the trade is this user's; the assignments are replaced
 * on save, so this is what `commissionOnSave` compares against.
 */
export async function listAssignmentCommissions(
  tradeId: number,
): Promise<Map<number, StoredCommission | null>> {
  const rows = await db
    .select({
      accountId: tradeAccounts.accountId,
      commission: tradeAccounts.commission,
      commissionSource: tradeAccounts.commissionSource,
    })
    .from(tradeAccounts)
    .where(eq(tradeAccounts.tradeId, tradeId));

  return new Map(
    rows.map((row) => [
      row.accountId,
      row.commission === null || row.commissionSource === null
        ? null
        : {
            cents: amountToCents(row.commission),
            source: row.commissionSource,
          },
    ]),
  );
}

// A tradeId from the client is only usable once it's checked against the
// current user — same treatment as getOwnedAccount in db/queries/accounts.ts.
export async function getOwnedTrade(userId: number, tradeId: number) {
  const [trade] = await db
    .select()
    .from(trades)
    .where(and(eq(trades.id, tradeId), eq(trades.userId, userId)))
    .limit(1);

  return trade;
}

export async function countTradeScreenshots(tradeId: number): Promise<number> {
  const [row] = await db
    .select({ count: count(tradeScreenshots.id) })
    .from(tradeScreenshots)
    .where(eq(tradeScreenshots.tradeId, tradeId));

  return row.count;
}

export async function getNextScreenshotSortOrder(
  tradeId: number,
): Promise<number> {
  const [{ maxSortOrder }] = await db
    .select({ maxSortOrder: max(tradeScreenshots.sortOrder) })
    .from(tradeScreenshots)
    .where(eq(tradeScreenshots.tradeId, tradeId));

  return (maxSortOrder ?? -1) + 1;
}

export async function getNextLinkSortOrder(tradeId: number): Promise<number> {
  const [{ maxSortOrder }] = await db
    .select({ maxSortOrder: max(tradeLinks.sortOrder) })
    .from(tradeLinks)
    .where(eq(tradeLinks.tradeId, tradeId));

  return (maxSortOrder ?? -1) + 1;
}

export async function countExistingConfluenceTags(
  ids: number[],
): Promise<number> {
  if (ids.length === 0) return 0;
  const rows = await db
    .select({ id: confluenceTags.id })
    .from(confluenceTags)
    .where(inArray(confluenceTags.id, ids));
  return rows.length;
}

export async function countExistingMistakeTags(ids: number[]): Promise<number> {
  if (ids.length === 0) return 0;
  const rows = await db
    .select({ id: mistakeTags.id })
    .from(mistakeTags)
    .where(inArray(mistakeTags.id, ids));
  return rows.length;
}

/**
 * Every screenshot storage key the user owns. Read by account deletion before
 * the user row goes: the cascade removes the screenshot rows, and without the
 * keys the files would stay on disk with nothing pointing at them.
 */
export async function listScreenshotKeysForUser(
  userId: number,
): Promise<string[]> {
  const rows = await db
    .select({ storageKey: tradeScreenshots.storageKey })
    .from(tradeScreenshots)
    .innerJoin(trades, eq(tradeScreenshots.tradeId, trades.id))
    .where(eq(trades.userId, userId));

  return rows.map((row) => row.storageKey);
}

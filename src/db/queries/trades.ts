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
import { calculatePnl } from "../../domain/pnl.ts";
import { dollarsToCents } from "../../lib/money.ts";
import { createSignedUploadUrl } from "../../lib/uploads/signed-url.ts";
import { db } from "../index.ts";
import { accounts } from "../schema/accounts.ts";
import { instruments } from "../schema/instruments.ts";
import {
  confluenceTags,
  mistakeTags,
  tradeAccounts,
  tradeLinks,
  tradeScreenshots,
  trades,
} from "../schema/trades.ts";

export const JOURNAL_PAGE_SIZE = 25;

export type JournalSortBy = "date" | "r";
export type JournalSortDir = "asc" | "desc";

export interface JournalFilters {
  userId: number;
  selectedAccountId: number | null;
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

export interface JournalTradeRow {
  id: number;
  tradeDate: string;
  taken: boolean;
  direction: "long" | "short";
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
  pnlCents: number | null;
  rMultiple: number | null;
  accounts: JournalTradeAccount[];
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
// no GROUP BY, no separate round trip per row.
const accountsJson = sql<JournalTradeAccount[]>`(
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ${accounts.id},
        'name', ${accounts.name},
        'isPractice', ${accounts.isPractice}
      )
      order by ${accounts.sortOrder}
    ),
    '[]'::jsonb
  )
  from ${tradeAccounts}
  join ${accounts} on ${accounts.id} = ${tradeAccounts.accountId}
  where ${tradeAccounts.tradeId} = ${trades.id}
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

// Sort key for "R-Multiple": for a taken trade this mirrors calculatePnl in
// src/domain/pnl.ts exactly (COALESCE the override, else derive from prices),
// simplified to a plain dollar ratio since dividing by cents or by dollars
// gives the same R — no cents scaling needed for a sort key. For a missed
// setup there is no exit, so it sorts by the same "would-be" mfe_r value the
// row displays (Design.md §4.9). Rendering itself never uses this expression;
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
      )
      / nullif(
          abs(${trades.entryPrice} - ${trades.stopPrice}) *
            ${instruments.pointValue} * ${trades.contracts},
          0
        )
    )
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
      ) * 100 + 0.5
    )
  end
)::bigint`;

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

interface TradeRowsQuery {
  userId: number;
  selectedAccountId: number | null;
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
  const baseQuery = db
    .select({
      id: trades.id,
      tradeDate: trades.tradeDate,
      taken: trades.taken,
      direction: trades.direction,
      instrumentSymbol: instruments.symbol,
      instrumentName: instruments.name,
      pointValue: instruments.pointValue,
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
      pnlOverride: trades.pnlOverride,
      accounts: accountsJson,
      screenshots: screenshotsJson,
      links: linksJson,
      totalCount: sql<number>`(count(*) over())::int`,
    })
    .from(trades)
    .innerJoin(instruments, eq(trades.instrumentId, instruments.id));

  const ownership = eq(trades.userId, input.userId);

  const query =
    input.selectedAccountId === null
      ? baseQuery.where(
          and(
            ownership,
            ...input.conditions,
            sql`(${trades.taken} = false or (${trades.taken} = true and ${hasRealAccount}))`,
          ),
        )
      : baseQuery.where(
          and(
            ownership,
            ...input.conditions,
            isVisibleForAccount(input.selectedAccountId),
          ),
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
    const contracts = row.contracts;

    let pnlCents: number | null = null;
    let rMultiple: number | null = null;
    if (row.taken && exitPrice !== null && contracts !== null) {
      const result = calculatePnl(
        {
          direction: row.direction as "long" | "short",
          entryPrice,
          exitPrice,
          contracts,
          pointValue,
          stopPrice: stopPrice ?? undefined,
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
      pnlCents,
      rMultiple: row.taken
        ? rMultiple
        : row.mfeR !== null
          ? Number(row.mfeR)
          : null,
      accounts: row.accounts,
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
): Promise<JournalTradesResult> {
  const { rows, totalCount } = await queryTradeRows({
    userId: filters.userId,
    selectedAccountId: filters.selectedAccountId,
    conditions: buildFilterConditions(filters),
    orderBy: buildOrderBy(filters),
    limit: JOURNAL_PAGE_SIZE,
    offset: (filters.page - 1) * JOURNAL_PAGE_SIZE,
  });

  const hiddenPracticeCounts =
    filters.selectedAccountId === null
      ? await listHiddenPracticeCounts(filters.userId)
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
): Promise<JournalTradeRow[]> {
  const { rows } = await queryTradeRows({
    userId,
    selectedAccountId,
    conditions: [],
    orderBy: [desc(trades.tradeDate), desc(trades.id)],
    limit,
  });

  return rows;
}

// Trades that are taken but assigned only to practice accounts — hidden from
// the combined list, surfaced only as this counter (project-overview.md:
// "nothing disappears silently"). A copy-traded trade assigned to several
// practice accounts is counted once per account, since this is an
// informational count, not a money aggregate — no multiplier applies.
async function listHiddenPracticeCounts(
  userId: number,
): Promise<JournalHiddenPracticeCount[]> {
  return db
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

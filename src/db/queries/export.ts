import { asc, eq, sql } from "drizzle-orm";
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

export interface ExportAccount {
  name: string;
  isPractice: boolean;
}

export interface ExportLink {
  url: string;
  label: string | null;
}

export interface ExportTradeRow {
  id: number;
  tradeDate: string;
  taken: boolean;
  instrumentSymbol: string;
  pointValue: string;
  direction: string;
  /** numeric(12, 4) as a string, e.g. `1.8800`. */
  contracts: string | null;
  entryTime: string;
  exitTime: string | null;
  entryPrice: string;
  exitPrice: string | null;
  stopPrice: string | null;
  points: string | null;
  session: string | null;
  setupType: string | null;
  entryModel: string | null;
  result: string | null;
  grade: string | null;
  felt: string | null;
  byTheBook: boolean | null;
  mfeR: string | null;
  maeR: string | null;
  postExitMfeR: string | null;
  pnlOverride: string | null;
  confluences: string[];
  mistakes: string[];
  notes: string | null;
  links: ExportLink[];
  screenshotCount: number;
  accounts: ExportAccount[];
  createdAt: Date;
}

// Ordered by sort_order so the names line up with the account switcher, and
// so the `accounts` and `is_practice` columns of the CSV stay positionally
// aligned: both are built from this one array.
const accountsJson = sql<ExportAccount[]>`(
  select coalesce(
    jsonb_agg(
      jsonb_build_object('name', ${accounts.name}, 'isPractice', ${accounts.isPractice})
      order by ${accounts.sortOrder}
    ),
    '[]'::jsonb
  )
  from ${tradeAccounts}
  join ${accounts} on ${accounts.id} = ${tradeAccounts.accountId}
  where ${tradeAccounts.tradeId} = ${trades.id}
)`;

const confluencesJson = sql<string[]>`(
  select coalesce(jsonb_agg(${confluenceTags.label} order by ${confluenceTags.id}), '[]'::jsonb)
  from ${tradeConfluences}
  join ${confluenceTags} on ${confluenceTags.id} = ${tradeConfluences.confluenceTagId}
  where ${tradeConfluences.tradeId} = ${trades.id}
)`;

const mistakesJson = sql<string[]>`(
  select coalesce(jsonb_agg(${mistakeTags.label} order by ${mistakeTags.id}), '[]'::jsonb)
  from ${tradeMistakes}
  join ${mistakeTags} on ${mistakeTags.id} = ${tradeMistakes.mistakeTagId}
  where ${tradeMistakes.tradeId} = ${trades.id}
)`;

const linksJson = sql<ExportLink[]>`(
  select coalesce(
    jsonb_agg(
      jsonb_build_object('url', ${tradeLinks.url}, 'label', ${tradeLinks.label})
      order by ${tradeLinks.sortOrder}
    ),
    '[]'::jsonb
  )
  from ${tradeLinks}
  where ${tradeLinks.tradeId} = ${trades.id}
)`;

// Screenshots are binary and cannot go into a CSV. The count goes in so the
// gap is visible in the file instead of silent.
const screenshotCount = sql<number>`(
  select count(*)::int
  from ${tradeScreenshots}
  where ${tradeScreenshots.tradeId} = ${trades.id}
)`;

/**
 * Every trade of the user, for the CSV export. Taken trades and missed setups,
 * practice-only trades included, in one query with no N+1.
 *
 * This deliberately applies **neither** the selected-account filter nor the
 * `accounts.is_practice = false` filter that every combined figure starts with
 * (coding-standards.md, Money). It is not a combined figure: it is a backup,
 * and "an export that depends on a UI filter is not a backup"
 * (project-overview.md, D). The practice split survives because it is written
 * out per account, not because practice rows are dropped.
 *
 * Ownership is the one filter that always applies.
 */
export async function listTradesForExport(
  userId: number,
): Promise<ExportTradeRow[]> {
  return db
    .select({
      id: trades.id,
      tradeDate: trades.tradeDate,
      taken: trades.taken,
      instrumentSymbol: instruments.symbol,
      pointValue: instruments.pointValue,
      direction: trades.direction,
      contracts: trades.contracts,
      entryTime: trades.entryTime,
      exitTime: trades.exitTime,
      entryPrice: trades.entryPrice,
      exitPrice: trades.exitPrice,
      stopPrice: trades.stopPrice,
      points: trades.points,
      session: trades.session,
      setupType: trades.setupType,
      entryModel: trades.entryModel,
      result: trades.result,
      grade: trades.grade,
      felt: trades.felt,
      byTheBook: trades.byTheBook,
      mfeR: trades.mfeR,
      maeR: trades.maeR,
      postExitMfeR: trades.postExitMfeR,
      pnlOverride: trades.pnlOverride,
      confluences: confluencesJson,
      mistakes: mistakesJson,
      notes: trades.notes,
      links: linksJson,
      screenshotCount,
      accounts: accountsJson,
      createdAt: trades.createdAt,
    })
    .from(trades)
    .innerJoin(instruments, eq(trades.instrumentId, instruments.id))
    .where(eq(trades.userId, userId))
    .orderBy(asc(trades.tradeDate), asc(trades.id));
}

import {
  and,
  arrayContains,
  asc,
  eq,
  inArray,
  isNotNull,
  isNull,
  sql,
} from "drizzle-orm";
import type { ProgramFields } from "../../lib/prop-firms/parse.ts";
import { db } from "../index.ts";
import { propFirmPrograms, propFirms } from "../schema/prop-firms.ts";

// Reference data, so unlike every other query module here there is no userId
// argument and no ownership filter. The page still sits behind the session,
// because it lives under src/app/[locale]/(app).

export interface PropFirmRow {
  firm: {
    id: number;
    name: string;
    website: string | null;
    lastVerifiedAt: string | null;
  };
  program: {
    id: number;
    name: string;
    summaryTags: string[];
    /** `account_size_usd` in whole cents; null when the file does not state it. */
    accountSizeCents: number | null;
  } & ProgramFields;
}

// Cents leave the database as an integer, so the page never parses the
// `numeric` string. int4 holds account sizes up to $21M.
const ACCOUNT_SIZE_CENTS = sql<
  number | null
>`(${propFirmPrograms.accountSizeUsd} * 100)::int`;

const SELECTION = {
  firm: {
    id: propFirms.id,
    name: propFirms.name,
    website: propFirms.website,
    lastVerifiedAt: propFirms.lastVerifiedAt,
  },
  program: {
    id: propFirmPrograms.id,
    name: propFirmPrograms.name,
    summaryTags: propFirmPrograms.summaryTags,
    accountSizeCents: ACCOUNT_SIZE_CENTS,
    accountSize: propFirmPrograms.accountSize,
    profitTarget: propFirmPrograms.profitTarget,
    maxDrawdown: propFirmPrograms.maxDrawdown,
    dailyLossLimit: propFirmPrograms.dailyLossLimit,
    minTradingDays: propFirmPrograms.minTradingDays,
    consistencyRule: propFirmPrograms.consistencyRule,
    consistencyWhenFunded: propFirmPrograms.consistencyWhenFunded,
    newsTrading: propFirmPrograms.newsTrading,
    overnight: propFirmPrograms.overnight,
    copyTrading: propFirmPrograms.copyTrading,
    firstPayout: propFirmPrograms.firstPayout,
    payoutCycle: propFirmPrograms.payoutCycle,
    maxPayoutCycle: propFirmPrograms.maxPayoutCycle,
    profitSplit: propFirmPrograms.profitSplit,
    liveProgram: propFirmPrograms.liveProgram,
    scaling: propFirmPrograms.scaling,
    endOfDayRule: propFirmPrograms.endOfDayRule,
    notes: propFirmPrograms.notes,
  },
};

// Firm name, program name and the eighteen rule fields, concatenated so the
// search is one predicate instead of twenty. Filtering happens in SQL
// (coding-standards.md, Database).
const SEARCHABLE = sql`concat_ws(' ',
  ${propFirms.name},
  ${propFirmPrograms.name},
  ${propFirmPrograms.accountSize},
  ${propFirmPrograms.profitTarget},
  ${propFirmPrograms.maxDrawdown},
  ${propFirmPrograms.dailyLossLimit},
  ${propFirmPrograms.minTradingDays},
  ${propFirmPrograms.consistencyRule},
  ${propFirmPrograms.consistencyWhenFunded},
  ${propFirmPrograms.newsTrading},
  ${propFirmPrograms.overnight},
  ${propFirmPrograms.copyTrading},
  ${propFirmPrograms.firstPayout},
  ${propFirmPrograms.payoutCycle},
  ${propFirmPrograms.maxPayoutCycle},
  ${propFirmPrograms.profitSplit},
  ${propFirmPrograms.liveProgram},
  ${propFirmPrograms.scaling},
  ${propFirmPrograms.endOfDayRule},
  ${propFirmPrograms.notes}
)`;

// A search term is data, not a pattern: "90%" must not turn into a wildcard.
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (character) => `\\${character}`);
}

// The catalogue shows what the firms sell today. A discontinued program keeps
// its row for linked accounts but leaves every catalogue list, and a firm
// with nothing on sale drops out of the inner join (docs/adr/0005).
const ON_SALE = isNull(propFirmPrograms.discontinuedAt);

export async function listPropFirms(
  filters: {
    search?: string;
    tags?: string[];
    /** Whole USD; a program matches any of them. */
    sizes?: number[];
  },
  executor: Pick<typeof db, "select"> = db,
): Promise<PropFirmRow[]> {
  const conditions = [ON_SALE];

  if (filters.search) {
    conditions.push(
      sql`${SEARCHABLE} ilike ${`%${escapeLike(filters.search)}%`}`,
    );
  }
  // Several chips narrow, they do not widen: `@>` means the program carries all
  // of them. Two chips from the same facet therefore match nothing, which is
  // the honest answer when nothing is known about which facet a tag belongs to.
  if (filters.tags && filters.tags.length > 0) {
    conditions.push(arrayContains(propFirmPrograms.summaryTags, filters.tags));
  }
  // Sizes widen among themselves (50k or 100k) and narrow against everything
  // else. A null size is in no list, so an unknown size never matches.
  if (filters.sizes && filters.sizes.length > 0) {
    conditions.push(
      inArray(propFirmPrograms.accountSizeUsd, filters.sizes.map(String)),
    );
  }

  return executor
    .select(SELECTION)
    .from(propFirms)
    .innerJoin(propFirmPrograms, eq(propFirmPrograms.firmId, propFirms.id))
    .where(and(...conditions))
    .orderBy(asc(propFirms.name), asc(propFirmPrograms.position));
}

// Every tag that occurs, once, alphabetically — the chip bar. Grouping them by
// facet would mean deciding which facet a tag belongs to, and that decision is
// not in the file.
export async function listSummaryTags(
  executor: Pick<typeof db, "selectDistinct"> = db,
): Promise<string[]> {
  const rows = await executor
    .selectDistinct({
      tag: sql<string>`unnest(${propFirmPrograms.summaryTags})`,
    })
    .from(propFirmPrograms)
    .where(ON_SALE)
    .orderBy(sql`1`);

  return rows.map((row) => row.tag);
}

export interface AccountSizeChip {
  /** Whole USD, the value the URL carries. */
  usd: number;
  /** The same size in cents, which the chip labels in the page's language. */
  cents: number;
}

// Every known account size, once, ascending — the size chips. Unknown sizes
// offer no chip, because no chip could match them.
export async function listAccountSizes(
  executor: Pick<typeof db, "selectDistinct"> = db,
): Promise<AccountSizeChip[]> {
  const rows = await executor
    .selectDistinct({
      // Whole dollars by construction: the parser only accepts `$NN,NNN`
      // (context/decisions.md), so the cast never rounds.
      usd: sql<number>`${propFirmPrograms.accountSizeUsd}::int`,
      cents: sql<number>`${ACCOUNT_SIZE_CENTS}`,
    })
    .from(propFirmPrograms)
    .where(and(ON_SALE, isNotNull(propFirmPrograms.accountSizeUsd)))
    .orderBy(ACCOUNT_SIZE_CENTS);

  return rows;
}

export interface ProgramOption {
  id: number;
  firmName: string;
  name: string;
  /** No longer sold; still linkable, its rule text as last seeded. */
  discontinued: boolean;
  /** The program's rule text, verbatim, shown beside each rule field. */
  reference: Pick<
    ProgramFields,
    | "accountSize"
    | "profitTarget"
    | "maxDrawdown"
    | "dailyLossLimit"
    | "consistencyRule"
    | "minTradingDays"
  >;
}

// Every program for the link form in the account editor, grouped by firm in
// the select, sizes in file order. Reference text only: nothing here becomes a
// rule value (docs/adr/0001). Discontinued programs stay in, marked, so an
// account bought before the firm stopped selling one can still link it
// (docs/adr/0005).
export async function listProgramOptions(
  executor: Pick<typeof db, "select"> = db,
): Promise<ProgramOption[]> {
  const rows = await executor
    .select({
      id: propFirmPrograms.id,
      firmName: propFirms.name,
      name: propFirmPrograms.name,
      discontinued: sql<boolean>`${propFirmPrograms.discontinuedAt} is not null`,
      accountSize: propFirmPrograms.accountSize,
      profitTarget: propFirmPrograms.profitTarget,
      maxDrawdown: propFirmPrograms.maxDrawdown,
      dailyLossLimit: propFirmPrograms.dailyLossLimit,
      consistencyRule: propFirmPrograms.consistencyRule,
      minTradingDays: propFirmPrograms.minTradingDays,
    })
    .from(propFirmPrograms)
    .innerJoin(propFirms, eq(propFirms.id, propFirmPrograms.firmId))
    .orderBy(asc(propFirms.name), asc(propFirmPrograms.position));
  return rows.map(({ id, firmName, name, discontinued, ...reference }) => ({
    id,
    firmName,
    name,
    discontinued,
    reference,
  }));
}

import { and, arrayContains, asc, eq, inArray, sql } from "drizzle-orm";
import type { ProgramFields } from "../../lib/prop-firms/parse.ts";
import { db } from "../index.ts";
import { propFirmPrograms, propFirms } from "../schema/prop-firms.ts";

// Reference data, so unlike every other query module here there is no userId
// argument and no ownership filter. The page still sits behind the session,
// because it lives under src/app/(app).

export interface PropFirmRow {
  firm: {
    id: number;
    name: string;
    website: string | null;
    lastVerifiedAt: string | null;
  };
  program: { id: number; name: string; summaryTags: string[] } & ProgramFields;
}

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

export async function listPropFirms(filters: {
  search?: string;
  tags?: string[];
}): Promise<PropFirmRow[]> {
  const conditions = [];

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

  return db
    .select(SELECTION)
    .from(propFirms)
    .innerJoin(propFirmPrograms, eq(propFirmPrograms.firmId, propFirms.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(propFirms.name), asc(propFirmPrograms.name));
}

// The compare selection lives in the URL and has to survive a reload even when
// the current filters hide one of the picked programs, so it is looked up by id
// rather than taken out of the filtered list.
export async function listPropFirmProgramsByIds(
  ids: number[],
): Promise<PropFirmRow[]> {
  if (ids.length === 0) return [];

  return db
    .select(SELECTION)
    .from(propFirms)
    .innerJoin(propFirmPrograms, eq(propFirmPrograms.firmId, propFirms.id))
    .where(inArray(propFirmPrograms.id, ids));
}

// Every tag that occurs, once, alphabetically — the chip bar. Grouping them by
// facet would mean deciding which facet a tag belongs to, and that decision is
// not in the file.
export async function listSummaryTags(): Promise<string[]> {
  const rows = await db
    .selectDistinct({
      tag: sql<string>`unnest(${propFirmPrograms.summaryTags})`,
    })
    .from(propFirmPrograms)
    .orderBy(sql`1`);

  return rows.map((row) => row.tag);
}

import { and, asc, eq, gte, inArray, lt, type SQL } from "drizzle-orm";
import { type EconEvent, HIGH_IMPACT } from "../../domain/econ.ts";
import { db } from "../index.ts";
import { econEvents } from "../schema/econ-events.ts";

// Reads and the one write behind the econ calendar. The page reads only from
// here; the feed is the job's business (project-overview.md, I).

/** Whatever runs the statement: the shared client, or a transaction in a test. */
export type EconExecutor = Pick<typeof db, "select" | "transaction">;

/**
 * Makes the table exactly `events`, in one transaction: everything that was
 * there goes, including last week's rows and anything the feed has since
 * moved or dropped. A reader sees the old calendar or the new one, never a
 * half-written one. Returns how many rows were written.
 */
export async function replaceEconEvents(
  events: EconEvent[],
  executor: EconExecutor = db,
): Promise<number> {
  await executor.transaction(async (tx) => {
    await tx.delete(econEvents);
    if (events.length > 0) await tx.insert(econEvents).values(events);
  });
  return events.length;
}

export interface EconEventFilters {
  /** Inclusive. */
  from: Date;
  /** Exclusive — the next week's Sunday midnight belongs to the next week. */
  to: Date;
  highOnly: boolean;
  /** Empty means every currency. */
  currencies: string[];
}

export type EconEventRow = EconEvent & { id: number };

export async function listEconEvents(
  filters: EconEventFilters,
  executor: Pick<typeof db, "select"> = db,
): Promise<EconEventRow[]> {
  const conditions: SQL[] = [
    gte(econEvents.occursAt, filters.from),
    lt(econEvents.occursAt, filters.to),
  ];
  if (filters.highOnly) conditions.push(eq(econEvents.impact, HIGH_IMPACT));
  if (filters.currencies.length > 0) {
    conditions.push(inArray(econEvents.currency, filters.currencies));
  }

  return executor
    .select({
      id: econEvents.id,
      occursAt: econEvents.occursAt,
      currency: econEvents.currency,
      title: econEvents.title,
      impact: econEvents.impact,
      forecast: econEvents.forecast,
      previous: econEvents.previous,
    })
    .from(econEvents)
    .where(and(...conditions))
    .orderBy(
      asc(econEvents.occursAt),
      asc(econEvents.currency),
      asc(econEvents.title),
      asc(econEvents.id),
    );
}

/**
 * Every currency with an event in the range, for the filter chips. Ignores
 * the other filters on purpose: a chip that is selected must stay on screen
 * to be deselected, even when "High impact" leaves it nothing to match.
 */
export async function listEconCurrencies(
  range: { from: Date; to: Date },
  executor: Pick<typeof db, "selectDistinct"> = db,
): Promise<string[]> {
  const rows = await executor
    .selectDistinct({ currency: econEvents.currency })
    .from(econEvents)
    .where(
      and(
        gte(econEvents.occursAt, range.from),
        lt(econEvents.occursAt, range.to),
      ),
    )
    .orderBy(asc(econEvents.currency));
  return rows.map((row) => row.currency);
}

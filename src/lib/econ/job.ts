// job:econ — the daily econ calendar sync (project-overview.md, I).
//
// Fetches both feed weeks and replaces `econ_events` with them. Both fetches
// finish before anything is written, and any failure throws before the
// write: the table keeps yesterday's calendar, so an outage of the unofficial
// feed costs freshness and never a page. Next week may simply not be
// published yet, which is not a failure — the table then holds this week.
//
// The same handler runs from `pnpm job:econ` and from the Vercel Cron route
// (/api/cron/econ), so it uses relative imports that plain node can resolve.

import { db } from "../../db/index.ts";
import { type EconExecutor, replaceEconEvents } from "../../db/queries/econ.ts";
import type { EconEvent } from "../../domain/econ.ts";
import { type FeedWeek, fetchFeedWeek } from "./forex-factory.ts";

export type WeekFetcher = (week: FeedWeek) => Promise<EconEvent[] | null>;

export interface EconJobResult {
  /** Events in this week's feed. */
  thisWeek: number;
  /** Events in next week's feed, or null while it is not published. */
  nextWeek: number | null;
}

export async function runEconJob(
  fetcher: WeekFetcher = fetchFeedWeek,
  executor: EconExecutor = db,
): Promise<EconJobResult> {
  const [thisWeek, nextWeek] = await Promise.all([
    fetcher("this"),
    fetcher("next"),
  ]);
  if (thisWeek === null) {
    throw new Error("Econ calendar: this week's feed is missing");
  }

  await replaceEconEvents([...thisWeek, ...(nextWeek ?? [])], executor);

  return { thisWeek: thisWeek.length, nextWeek: nextWeek?.length ?? null };
}

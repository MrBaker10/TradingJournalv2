// The econ calendar's one source: Forex Factory's weekly JSON feed
// (project-overview.md, I). Unofficial and without a guarantee, which is why
// it lives behind this one file — if the feed changes shape or disappears,
// this is what gets replaced, and the job, the table and the page stay.
//
// Only the cron job calls it (src/lib/econ/job.ts). A request never does.
// The addresses are fixed; nothing a user types ever reaches them. Fetching
// and parsing are separate so the parser is testable without a network.
//
// The feed answers the default fetch headers; no User-Agent is needed. It
// rate-limits hard — HTTP 429 after a handful of requests within minutes
// (both checked 2026-09-28). One run a day is two requests, far below that;
// a 429 is a failure like any other and leaves the stored calendar alone.

import type { EconEvent } from "../../domain/econ.ts";

const ENDPOINTS = {
  this: "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
  next: "https://nfs.faireconomy.media/ff_calendar_nextweek.json",
} as const;

export type FeedWeek = keyof typeof ENDPOINTS;

const TIMEOUT_MS = 10_000;

// "2026-09-27T19:50:00-04:00" — the feed writes New York time with its offset,
// so the string is an instant and `new Date` reads it exactly.
const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * The response body as events, or a thrown error. Anything that is not
 * exactly the expected shape throws with its row: a half-read feed would
 * replace a complete table with a partial one.
 */
export function parseEvents(body: unknown): EconEvent[] {
  if (!Array.isArray(body)) {
    throw new Error("Unexpected calendar response: not a list");
  }
  return body.map((row, index) => {
    const { title, country, date, impact, forecast, previous } = (row ??
      {}) as Record<string, unknown>;
    if (
      !nonEmpty(title) ||
      !nonEmpty(country) ||
      !nonEmpty(impact) ||
      typeof date !== "string" ||
      !ISO_WITH_OFFSET.test(date) ||
      Number.isNaN(new Date(date).getTime()) ||
      typeof forecast !== "string" ||
      typeof previous !== "string"
    ) {
      throw new Error(`Unexpected calendar response at row ${index + 1}`);
    }
    return {
      occursAt: new Date(date),
      currency: country.trim(),
      title: title.trim(),
      impact: impact.trim(),
      forecast: forecast.trim() === "" ? null : forecast.trim(),
      previous: previous.trim() === "" ? null : previous.trim(),
    };
  });
}

/**
 * One week of the feed. `null` means the week is not published yet: the
 * next-week file answers 404 until Forex Factory puts it up later in the week
 * (seen on a Monday, 2026-09-28). The current week has no such excuse, so a
 * 404 there throws like any other failure.
 */
export async function fetchFeedWeek(
  week: FeedWeek,
): Promise<EconEvent[] | null> {
  const response = await fetch(ENDPOINTS[week], {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (week === "next" && response.status === 404) return null;
  if (!response.ok) {
    throw new Error(
      `Econ calendar unavailable for ${week} week (HTTP ${response.status})`,
    );
  }
  // An HTML page in place of the file — an error or rate-limit page from the
  // CDN in front of it — fails here with a readable message, not in `json()`.
  if (!response.headers.get("content-type")?.includes("json")) {
    throw new Error(`Econ calendar for ${week} week is not JSON`);
  }
  return parseEvents(await response.json());
}

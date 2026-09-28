// job:month-close — freezes the consistency score of the month that just
// ended, once per user (P2.6). When and whether a month is written is
// src/domain/month-close.ts; the score itself is src/domain/consistency.ts,
// fed by the same query /progress uses, so a frozen month reads exactly as
// the live one did.
//
// Runs daily. The calendar is each user's own (`users.timezone`), so on any
// given run one user may be on their close day while another is not yet. The
// job awards no badge — `score_90` is picked up by the next write path that
// syncs badges.
//
// The same handler runs from `pnpm job:month-close` and from the Vercel Cron
// route (/api/cron/month-close), so it uses relative imports that plain node
// can resolve.

import { db } from "../../db/index.ts";
import { getMonthScoreDays } from "../../db/queries/dashboard.ts";
import {
  monthlyScoreExists,
  upsertMonthlyScore,
} from "../../db/queries/monthly-scores.ts";
import { users } from "../../db/schema/users.ts";
import { calculateConsistencyScore } from "../../domain/consistency.ts";
import { monthToClose, shouldWrite } from "../../domain/month-close.ts";
import { calendarDateOf, monthKeyOf, todayInTimeZone } from "../time.ts";

export interface MonthCloseJobResult {
  users: number;
  /** Months written this run, overwrites on the close day included. */
  written: number;
}

type JobExecutor = Pick<typeof db, "select" | "insert" | "with" | "$with">;

export async function runMonthCloseJob(
  now: Date = new Date(),
  executor: JobExecutor = db,
): Promise<MonthCloseJobResult> {
  const allUsers = await executor
    .select({
      id: users.id,
      timezone: users.timezone,
      createdAt: users.createdAt,
    })
    .from(users);

  let written = 0;
  for (const user of allUsers) {
    const today = todayInTimeZone(user.timezone, now);
    const registeredMonth = monthKeyOf(
      calendarDateOf(user.createdAt, user.timezone),
    );

    const target = monthToClose(today, registeredMonth);
    if (target === null) continue;

    const exists = await monthlyScoreExists(user.id, target.month, executor);
    if (!shouldWrite(target.isCloseDay, exists)) continue;

    const days = await getMonthScoreDays(user.id, target.month, executor);
    // `today` lies after the month; the module caps it at the month's end.
    const score = calculateConsistencyScore(days, target.month, today);
    await upsertMonthlyScore(user.id, target.month, score, executor);
    written += 1;
  }

  return { users: allUsers.length, written };
}

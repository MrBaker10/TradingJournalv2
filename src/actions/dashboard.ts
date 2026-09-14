"use server";

import {
  getDashboardRewardState,
  getStreakEntryDays,
  setDashboardSeenAt,
  setStreakMilestoneSeen,
} from "@/db/queries/dashboard";
import { calculateStreak, pendingStreakMilestone } from "@/domain/streak";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { todayInTimeZone } from "@/lib/time";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Called by the streak tile after it has bumped, so the bump happens once per
 * newly logged trade rather than on every visit. Takes no arguments: which
 * user and which moment is the server's business.
 *
 * Deliberately not called while the dashboard renders — a GET that writes
 * would mark the bump as spent even when the response never reached anyone.
 */
export async function markDashboardSeen(): Promise<ActionResult<null>> {
  try {
    const user = await getCurrentUser();
    await setDashboardSeenAt(user.id);
    return { success: true, data: null };
  } catch {
    return { success: false, error: "Couldn't mark the dashboard as seen." };
  }
}

/**
 * Called by the milestone card once it has been rendered.
 *
 * It takes no arguments on purpose. An earlier version accepted the milestone
 * from the client and only checked that it was one of the three §6 names —
 * which let a hand-made call store 100 and silence every future card. The
 * server already knows the streak, so it works the number out itself and the
 * client has nothing to get wrong.
 */
export async function markStreakMilestoneSeen(): Promise<ActionResult<null>> {
  try {
    const user = await getCurrentUser();
    const [entryDays, rewards] = await Promise.all([
      getStreakEntryDays(user.id),
      getDashboardRewardState(user.id),
    ]);

    const streak = calculateStreak(
      entryDays,
      todayInTimeZone(user.timezone),
      user.timezone,
    );
    const milestone = pendingStreakMilestone(
      streak.current,
      rewards.milestoneSeen,
    );

    // Nothing due means the card should not have been on screen. Not an error
    // — a stale tab can get here — but nothing to record either.
    if (milestone === null) return { success: true, data: null };

    await setStreakMilestoneSeen(user.id, milestone);
    return { success: true, data: null };
  } catch {
    return { success: false, error: "Couldn't mark the milestone as seen." };
  }
}

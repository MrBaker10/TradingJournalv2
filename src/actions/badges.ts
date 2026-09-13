"use server";

import { setBadgesSeenAt } from "@/db/queries/badges";
import { getCurrentUser } from "@/lib/auth/get-current-user";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Called by the unlock card once it has been rendered, so the card shows
 * exactly once. It takes no arguments at all: which user and which moment is
 * the server's business, and there is nothing here a client could get wrong.
 */
export async function markBadgesSeen(): Promise<ActionResult<null>> {
  try {
    const user = await getCurrentUser();
    await setBadgesSeenAt(user.id);
    return { success: true, data: null };
  } catch {
    return { success: false, error: "Couldn't mark the badges as seen." };
  }
}

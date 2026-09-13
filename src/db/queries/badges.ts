import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../index.ts";
import { badgeDefs, userBadges } from "../schema/badges.ts";
import { users } from "../schema/users.ts";

export interface EarnedBadge {
  /** The natural key from `src/domain/badges.ts`. */
  key: string;
  earnedAt: Date;
}

/**
 * The badges this user has actually been given, with the moment they were
 * given. Not the same question as `earnedBadges()` in the domain module: that
 * one asks what the numbers currently satisfy, this one reads what was
 * written and can never be taken back.
 */
export async function listUserBadges(userId: number): Promise<EarnedBadge[]> {
  const rows = await db
    .select({ key: badgeDefs.key, earnedAt: userBadges.earnedAt })
    .from(userBadges)
    .innerJoin(badgeDefs, eq(badgeDefs.id, userBadges.badgeDefId))
    .where(eq(userBadges.userId, userId));

  return rows.map((row) => ({ key: row.key, earnedAt: row.earnedAt }));
}

/**
 * Writes one row per key, skipping anything the user already has — the unique
 * index on (user_id, badge_def_id) is what makes a concurrent second call
 * harmless rather than a duplicate.
 *
 * A key with no row in `badge_defs` is silently skipped, which is the right
 * behaviour: the definitions are seeded by `pnpm db:seed:badges`, and a
 * missing seed must not fail a trade write.
 *
 * Returns the keys that were actually inserted, so the caller knows what is
 * new without reading the table again.
 */
export async function insertEarnedBadges(
  userId: number,
  keys: string[],
): Promise<string[]> {
  if (keys.length === 0) return [];

  const defs = await db
    .select({ id: badgeDefs.id, key: badgeDefs.key })
    .from(badgeDefs)
    .where(inArray(badgeDefs.key, keys));

  if (defs.length === 0) return [];

  const inserted = await db
    .insert(userBadges)
    .values(defs.map((def) => ({ userId, badgeDefId: def.id })))
    .onConflictDoNothing()
    .returning({ badgeDefId: userBadges.badgeDefId });

  const insertedIds = new Set(inserted.map((row) => row.badgeDefId));
  return defs.filter((def) => insertedIds.has(def.id)).map((def) => def.key);
}

export async function getBadgesSeenAt(userId: number): Promise<Date | null> {
  const [row] = await db
    .select({ badgesSeenAt: users.badgesSeenAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return row?.badgesSeenAt ?? null;
}

/**
 * Marks everything earned so far as seen. Called after the page has shown the
 * unlock card, not while rendering it — otherwise the card would mark itself
 * as seen before the user ever laid eyes on it.
 */
export async function setBadgesSeenAt(userId: number): Promise<void> {
  await db
    .update(users)
    .set({ badgesSeenAt: sql`now()` })
    .where(eq(users.id, userId));
}

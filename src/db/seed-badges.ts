import { BADGE_DEFINITIONS } from "../domain/badges.ts";
import { db } from "./index.ts";
import { badgeDefs } from "./schema/badges.ts";

// Idempotent: the twelve definitions live in the domain module, `key` is the
// natural key, so re-running changes nothing. Not a migration, because a
// badge's wording may change while migrations stay immutable.
async function seed() {
  for (const badge of BADGE_DEFINITIONS) {
    await db
      .insert(badgeDefs)
      .values({
        key: badge.key,
        category: badge.category,
        title: badge.title,
        description: badge.description,
      })
      .onConflictDoNothing({ target: badgeDefs.key });
  }

  console.log(`Seeded ${BADGE_DEFINITIONS.length} badge definitions.`);
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});

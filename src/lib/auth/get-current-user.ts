import { eq } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { users } from "../../db/schema/users.ts";

const SEEDED_USERNAME = "local";

/**
 * Phase 1: no session, no auth. Returns the single user `pnpm db:seed` creates.
 * Phase 2 swaps this implementation for Better Auth; the signature stays the same.
 */
export async function getCurrentUser() {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, SEEDED_USERNAME))
    .limit(1);

  if (!user) {
    throw new Error(
      `Seeded user '${SEEDED_USERNAME}' not found. Run "pnpm db:seed" first.`,
    );
  }

  return user;
}

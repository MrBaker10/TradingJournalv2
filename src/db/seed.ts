import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { placeholderEmail } from "../lib/auth/placeholder-email.ts";
import { db } from "./index.ts";
import { accounts } from "./schema/accounts.ts";
import { authAccounts } from "./schema/auth.ts";
import { users } from "./schema/users.ts";

// The demo user is the phase-1 user `local`, with the trades and accounts it
// already has. Phase 2 only adds a password so it can sign in like anyone
// else. The password comes from DEMO_USER_PASSWORD and nowhere else — it is
// never in the code and never in a file in the repo.
const DEMO_USERNAME = "local";

// Better Auth's own minimum (emailAndPassword.minPasswordLength default).
const MIN_PASSWORD_LENGTH = 8;

async function seed() {
  const password = process.env.DEMO_USER_PASSWORD;
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Set DEMO_USER_PASSWORD (at least ${MIN_PASSWORD_LENGTH} characters) in .env.local before seeding.`,
    );
  }

  const [seededUser] = await db
    .insert(users)
    .values({
      username: DEMO_USERNAME,
      displayUsername: DEMO_USERNAME,
      email: placeholderEmail(DEMO_USERNAME),
      displayName: "Local User",
      timezone: "Europe/Berlin",
    })
    .onConflictDoUpdate({
      target: users.username,
      set: {
        displayName: "Local User",
        timezone: "Europe/Berlin",
      },
    })
    .returning({ id: users.id });

  console.log(`Seeded user '${DEMO_USERNAME}'.`);

  // The same row Better Auth writes at sign-up: provider "credential",
  // accountId = the user's id. Re-running the seed sets the password anew.
  const passwordHash = await hashPassword(password);
  const [credential] = await db
    .select({ id: authAccounts.id })
    .from(authAccounts)
    .where(
      and(
        eq(authAccounts.userId, seededUser.id),
        eq(authAccounts.providerId, "credential"),
      ),
    )
    .limit(1);

  if (credential) {
    await db
      .update(authAccounts)
      .set({ password: passwordHash })
      .where(eq(authAccounts.id, credential.id));
  } else {
    await db.insert(authAccounts).values({
      userId: seededUser.id,
      accountId: String(seededUser.id),
      providerId: "credential",
      password: passwordHash,
    });
  }

  console.log(`Set the password for '${DEMO_USERNAME}'.`);

  const [existingAccount] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, seededUser.id))
    .limit(1);

  if (!existingAccount) {
    await db.insert(accounts).values({
      userId: seededUser.id,
      name: "Main",
      sortOrder: 0,
      isDefaultForNewTrades: true,
      isPractice: false,
    });
    console.log("Seeded default account 'Main'.");
  }

  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});

import { eq } from "drizzle-orm";
import { db } from "./index.ts";
import { accounts } from "./schema/accounts.ts";
import { users } from "./schema/users.ts";

async function seed() {
  const [seededUser] = await db
    .insert(users)
    .values({
      username: "local",
      displayName: "Local User",
      timezone: "UTC",
      currencyDisplay: "USD",
    })
    .onConflictDoUpdate({
      target: users.username,
      set: {
        displayName: "Local User",
        timezone: "UTC",
        currencyDisplay: "USD",
      },
    })
    .returning({ id: users.id });

  console.log("Seeded user 'local'.");

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

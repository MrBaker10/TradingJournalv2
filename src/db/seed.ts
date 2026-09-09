import { db } from "./index.ts";
import { users } from "./schema/users.ts";

async function seed() {
  await db
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
    });

  console.log("Seeded user 'local'.");
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});

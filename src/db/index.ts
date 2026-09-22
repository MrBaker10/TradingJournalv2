import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../lib/env.ts";
import * as accounts from "./schema/accounts.ts";
import * as auth from "./schema/auth.ts";
import * as importBatches from "./schema/import-batches.ts";
import * as instruments from "./schema/instruments.ts";
import * as trades from "./schema/trades.ts";
import * as users from "./schema/users.ts";

// On Neon, DATABASE_URL is the pooled connection (PgBouncer in transaction
// mode). A prepared statement lives on one server connection, and the pooler
// hands the next query to another one, so postgres.js must not prepare.
const client = postgres(env.DATABASE_URL, { prepare: false });

export const db = drizzle(client, {
  schema: {
    ...users,
    ...instruments,
    ...accounts,
    ...auth,
    ...importBatches,
    ...trades,
  },
});

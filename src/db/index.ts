import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../lib/env.ts";
import * as accounts from "./schema/accounts.ts";
import * as instruments from "./schema/instruments.ts";
import * as trades from "./schema/trades.ts";
import * as users from "./schema/users.ts";

const client = postgres(env.DATABASE_URL);

export const db = drizzle(client, {
  schema: { ...users, ...instruments, ...accounts, ...trades },
});

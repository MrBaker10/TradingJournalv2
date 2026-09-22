import { defineConfig } from "drizzle-kit";
import { env } from "./src/lib/env";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/*",
  out: "./src/db/migrations",
  dbCredentials: {
    // Migrations take the direct connection on Neon; locally there is only one.
    url: env.DATABASE_URL_DIRECT ?? env.DATABASE_URL,
  },
});

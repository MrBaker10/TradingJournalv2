import { sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
// Thunk-based .references() below lets this file and users.ts import each
// other: neither dereferences the other table's column until Drizzle calls
// the callback, so the cycle (accounts -> users for user_id, users ->
// accounts for selected_account_id) never has to resolve at module-load time.
// The explicit AnyPgColumn return type breaks TypeScript's circular type
// inference between the two mutually referencing tables.
import { users } from "./users.ts";

export const accounts = pgTable(
  "accounts",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references((): AnyPgColumn => users.id),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull(),
    isDefaultForNewTrades: boolean("is_default_for_new_trades")
      .notNull()
      .default(false),
    isPractice: boolean("is_practice").notNull().default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Only one default account per user. A partial index only looks at rows
    // where the flag is true, so any number of non-default rows coexist.
    uniqueIndex("accounts_user_default_unique")
      .on(table.userId)
      .where(sql`${table.isDefaultForNewTrades} = true`),
    index("accounts_user_sort_idx").on(table.userId, table.sortOrder),
  ],
);

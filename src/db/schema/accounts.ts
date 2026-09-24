import { sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { ACCOUNT_CURRENCIES } from "../../domain/fx.ts";
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
      .references((): AnyPgColumn => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull(),
    isDefaultForNewTrades: boolean("is_default_for_new_trades")
      .notNull()
      .default(false),
    isPractice: boolean("is_practice").notNull().default(false),
    // The currency the broker reports this account's P&L in. Trades are still
    // stored in USD; an import converts once, with the trade date's ECB rate
    // (src/domain/fx.ts). Changeable only while no trade is assigned.
    currency: text("currency", { enum: ACCOUNT_CURRENCIES })
      .notNull()
      .default("USD"),
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
    check(
      "accounts_currency_check",
      sql.raw(
        `currency in (${ACCOUNT_CURRENCIES.map((c) => `'${c}'`).join(", ")})`,
      ),
    ),
  ],
);

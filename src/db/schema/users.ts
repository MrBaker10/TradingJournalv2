import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
// Thunk-based .references() below lets this file and accounts.ts import each
// other: neither dereferences the other table's column until Drizzle calls
// the callback, so the cycle never has to resolve at module-load time. The
// explicit AnyPgColumn return type breaks TypeScript's circular type
// inference between the two mutually referencing tables.
import { accounts } from "./accounts.ts";

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  discordUsername: text("discord_username"),
  timezone: text("timezone").notNull(),
  currencyDisplay: text("currency_display").notNull().default("USD"),
  selectedAccountId: integer("selected_account_id").references(
    (): AnyPgColumn => accounts.id,
    { onDelete: "set null" },
  ),
  passwordHash: text("password_hash"),
  totpSecret: text("totp_secret"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  discordUsername: text("discord_username"),
  timezone: text("timezone").notNull(),
  currencyDisplay: text("currency_display").notNull().default("USD"),
  // No FK yet: `accounts` does not exist in this slice. The constraint is added
  // when the Accounts slice creates its table.
  selectedAccountId: integer("selected_account_id"),
  passwordHash: text("password_hash"),
  totpSecret: text("totp_secret"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

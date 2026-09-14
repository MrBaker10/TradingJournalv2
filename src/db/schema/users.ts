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
  // When the user last looked at /progress. A badge earned after this is
  // "newly unlocked" and gets the card from Design.md §6 exactly once. NULL
  // means they have never looked, so everything earned counts as new.
  badgesSeenAt: timestamp("badges_seen_at", { withTimezone: true }),
  // Same idea as badgesSeenAt, for the streak bump (Design.md §4.3): a trade
  // logged after this timestamp means the tile bumps once on the next visit.
  // NULL means they have never opened the dashboard, so any trade counts.
  dashboardSeenAt: timestamp("dashboard_seen_at", { withTimezone: true }),
  // The highest streak milestone (7, 30, 100) whose card has been shown.
  // §6 words this as "once per session"; it is stored per user instead, the
  // way the badge card already works — see decisions.md.
  streakMilestoneSeen: integer("streak_milestone_seen"),
  passwordHash: text("password_hash"),
  totpSecret: text("totp_secret"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

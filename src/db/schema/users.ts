import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
// Thunk-based .references() below lets this file and accounts.ts import each
// other: neither dereferences the other table's column until Drizzle calls
// the callback, so the cycle never has to resolve at module-load time. The
// explicit AnyPgColumn return type breaks TypeScript's circular type
// inference between the two mutually referencing tables.
import { accounts } from "./accounts.ts";

// Also Better Auth's user table (src/lib/auth/auth.ts maps its model onto
// this one), so the columns from `email` to `twoFactorEnabled` are the ones
// Better Auth requires. Credentials, sessions and TOTP secrets live in
// auth.ts, never here.
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  // Immutable after registration. Stored lowercased by the username plugin;
  // `displayUsername` keeps the spelling the user typed.
  username: text("username").notNull().unique(),
  displayUsername: text("display_username"),
  displayName: text("display_name").notNull(),
  // Better Auth requires a unique email; this app has none. It holds
  // `<username>@users.invalid` (RFC 2606 reserves .invalid), is never shown
  // and never mailed — see src/lib/auth/placeholder-email.ts.
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  discordUsername: text("discord_username"),
  timezone: text("timezone").notNull(),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

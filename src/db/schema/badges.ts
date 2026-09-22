import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users.ts";

// The twelve badge definitions live in src/domain/badges.ts and are pushed
// here by src/db/seed-badges.ts. `key` is the natural key both sides agree
// on, so the seeder stays idempotent.
export const badgeDefs = pgTable("badge_defs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: text("key").notNull().unique(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
});

// One row per badge a user has earned. Nothing writes here yet — awarding
// badges is its own slice.
export const userBadges = pgTable(
  "user_badges",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    badgeDefId: integer("badge_def_id")
      .notNull()
      .references(() => badgeDefs.id),
    earnedAt: timestamp("earned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("user_badges_unique").on(table.userId, table.badgeDefId),
  ],
);

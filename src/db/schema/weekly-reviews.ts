import {
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users.ts";

// One row per user and review week (GLOSSARY.md, Weekly review). It belongs to
// the user, never to an account, and feeds no score, streak or badge.
//
// `week_start` is the Sunday that opens the review week, a plain `date` like
// `daily_notes.note_date`. The unique index makes saving an upsert, and the
// three fields stay nullable so an empty field is stored as NULL, not "".
export const weeklyReviews = pgTable(
  "weekly_reviews",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekStart: date("week_start").notNull(),
    whatWorked: text("what_worked"),
    whatDidNotWork: text("what_did_not_work"),
    focusNextWeek: text("focus_next_week"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("weekly_reviews_user_week_unique").on(
      table.userId,
      table.weekStart,
    ),
  ],
);

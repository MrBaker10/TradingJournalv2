import {
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users.ts";

// One row per user and calendar date, holding the pre-market plan and the
// optional end-of-day review (project-overview.md, Data Model). Both are
// process values: the review feeds the review-habit share of the consistency
// score, the plan feeds nothing but the habit itself.
//
// `note_date` is a plain `date` in the user's own calendar, like
// `trades.trade_date` — the zone was applied before the value got here. The
// unique index is what makes saving an upsert: writing the plan and writing
// the review later are two writes to the same row.
export const dailyNotes = pgTable(
  "daily_notes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    noteDate: date("note_date").notNull(),
    premarketPlan: text("premarket_plan"),
    eodReview: text("eod_review"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("daily_notes_user_date_unique").on(
      table.userId,
      table.noteDate,
    ),
  ],
);

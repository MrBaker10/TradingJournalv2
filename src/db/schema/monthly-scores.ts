import { sql } from "drizzle-orm";
import {
  check,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users.ts";

// The consistency score of a finished month, frozen by the month-close job
// (src/lib/month-close/job.ts, rules in src/domain/month-close.ts). One row
// per user and month, a zero month included.
//
// `month` is a `YYYY-MM` key in the user's own calendar, the same key
// src/domain/consistency.ts takes. `score` is rounded from the exact parts
// before it is stored, exactly as calculateConsistencyScore rounds it; the
// parts keep four decimals, which is more than any display needs.
export const monthlyScores = pgTable(
  "monthly_scores",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    month: text("month").notNull(),
    score: integer("score").notNull(),
    showingUp: numeric("showing_up", { precision: 7, scale: 4 }).notNull(),
    completeness: numeric("completeness", { precision: 7, scale: 4 }).notNull(),
    planAdherence: numeric("plan_adherence", {
      precision: 7,
      scale: 4,
    }).notNull(),
    reviewHabit: numeric("review_habit", { precision: 7, scale: 4 }).notNull(),
    // When the row was last written — set again when the close day overwrites.
    computedAt: timestamp("computed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.month] }),
    check(
      "monthly_scores_month_check",
      sql`${table.month} ~ '^\\d{4}-\\d{2}$'`,
    ),
    check("monthly_scores_score_check", sql`${table.score} between 0 and 100`),
  ],
);

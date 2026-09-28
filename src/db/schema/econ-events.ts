import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// The econ calendar, as the daily sync last saw it: exactly the events of the
// Forex Factory "this week" and "next week" feeds, nothing older and nothing
// from anywhere else (project-overview.md, I). Reference data like
// `instruments` — no user_id, no per-user filter.
//
// Filled only by src/lib/econ/job.ts, which replaces the whole table in one
// transaction. The feed carries no id, so there is no natural key to upsert
// on, and a replace also drops an event the feed moved or removed.
export const econEvents = pgTable(
  "econ_events",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    // An instant, not a chart-clock time: one of the two places in the schema
    // where `timestamptz` is right (coding-standards.md, Time). The page reads
    // it in `users.timezone`.
    occursAt: timestamp("occurs_at", { withTimezone: true }).notNull(),
    // The feed's `country`, which is a currency code ("USD", "EUR").
    currency: text("currency").notNull(),
    title: text("title").notNull(),
    // As the feed writes it: High, Medium, Low or Holiday.
    impact: text("impact").notNull(),
    // Display text, never parsed ("3.6%", "-12.5K", "<0.1%"). NULL when the
    // feed leaves it empty.
    forecast: text("forecast"),
    previous: text("previous"),
  },
  (table) => [index("econ_events_occurs_at_idx").on(table.occursAt)],
);

import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users.ts";

// A private trading strategy (GLOSSARY.md, Trading strategy): identity,
// owner and archive state only. The name and the rules live in immutable
// `strategy_revisions`, so a later edit never rewrites what an earlier
// assignment saw (docs/adr/0003). It belongs to the user, never to an account.
export const tradingStrategies = pgTable(
  "trading_strategies",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Null while the strategy can be assigned to new trades.
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("trading_strategies_user_idx").on(table.userId)],
);

// One recorded rule set (GLOSSARY.md, Strategy revision). Rows are only ever
// inserted: the current rules of a strategy are its revision with the highest
// id. Chapters are plain text; an empty one is NULL, not "".
export const strategyRevisions = pgTable(
  "strategy_revisions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    strategyId: integer("strategy_id")
      .notNull()
      .references(() => tradingStrategies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    prerequisites: text("prerequisites"),
    entry: text("entry"),
    stopRisk: text("stop_risk"),
    exit: text("exit"),
    exclusions: text("exclusions"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("strategy_revisions_strategy_idx").on(table.strategyId, table.id),
  ],
);

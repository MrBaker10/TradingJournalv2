import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { accounts } from "./accounts.ts";
import { instruments } from "./instruments.ts";
import { users } from "./users.ts";

export const trades = pgTable(
  "trades",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    tradeDate: date("trade_date").notNull(),
    instrumentId: integer("instrument_id")
      .notNull()
      .references(() => instruments.id),
    // false = missed setup. Not a second table (decisions.md).
    taken: boolean("taken").notNull(),
    contracts: integer("contracts"),
    // Chart-clock times, never converted (coding-standards.md, Time).
    entryTime: time("entry_time").notNull(),
    exitTime: time("exit_time"),
    session: text("session"),
    direction: text("direction").notNull(),
    setupType: text("setup_type"),
    entryModel: text("entry_model"),
    entryPrice: numeric("entry_price", { precision: 12, scale: 4 }).notNull(),
    exitPrice: numeric("exit_price", { precision: 12, scale: 4 }),
    stopPrice: numeric("stop_price", { precision: 12, scale: 4 }),
    mfeR: numeric("mfe_r", { precision: 8, scale: 2 }),
    maeR: numeric("mae_r", { precision: 8, scale: 2 }),
    // Manual field, shown only when a stop price is set — cannot be derived,
    // deriving it would need price data after the exit (project-overview.md).
    postExitMfeR: numeric("post_exit_mfe_r", { precision: 8, scale: 2 }),
    points: numeric("points", { precision: 12, scale: 4 }),
    pnlOverride: numeric("pnl_override", { precision: 14, scale: 2 }),
    result: text("result"),
    grade: text("grade"),
    felt: text("felt"),
    byTheBook: boolean("by_the_book"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("trades_user_date_idx").on(table.userId, table.tradeDate),
    index("trades_user_taken_idx").on(table.userId, table.taken),
  ],
);

export const tradeAccounts = pgTable(
  "trade_accounts",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tradeId: integer("trade_id")
      .notNull()
      .references(() => trades.id, { onDelete: "cascade" }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id),
  },
  (table) => [
    uniqueIndex("trade_accounts_unique").on(table.tradeId, table.accountId),
    index("trade_accounts_account_idx").on(table.accountId),
  ],
);

export const confluenceTags = pgTable(
  "confluence_tags",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    group: text("group").notNull(),
    label: text("label").notNull(),
  },
  (table) => [
    uniqueIndex("confluence_tags_group_label_unique").on(
      table.group,
      table.label,
    ),
  ],
);

export const tradeConfluences = pgTable(
  "trade_confluences",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tradeId: integer("trade_id")
      .notNull()
      .references(() => trades.id, { onDelete: "cascade" }),
    confluenceTagId: integer("confluence_tag_id")
      .notNull()
      .references(() => confluenceTags.id),
  },
  (table) => [
    uniqueIndex("trade_confluences_unique").on(
      table.tradeId,
      table.confluenceTagId,
    ),
  ],
);

export const mistakeTags = pgTable("mistake_tags", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  label: text("label").notNull().unique(),
});

export const tradeMistakes = pgTable(
  "trade_mistakes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tradeId: integer("trade_id")
      .notNull()
      .references(() => trades.id, { onDelete: "cascade" }),
    mistakeTagId: integer("mistake_tag_id")
      .notNull()
      .references(() => mistakeTags.id),
  },
  (table) => [
    uniqueIndex("trade_mistakes_unique").on(table.tradeId, table.mistakeTagId),
  ],
);

// Up to three per trade (enforced in src/domain/trades.ts,
// canAddScreenshot), private, served only through signed URLs
// (coding-standards.md). storageKey is the src/lib/storage/ key, never the
// raw file path exposed to the client.
export const tradeScreenshots = pgTable(
  "trade_screenshots",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tradeId: integer("trade_id")
      .notNull()
      .references(() => trades.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [index("trade_screenshots_trade_idx").on(table.tradeId)],
);

// Arbitrarily many per trade, https-only (validated in src/schemas/trades.ts,
// never fetched server-side — coding-standards.md, "External links on
// trades").
export const tradeLinks = pgTable(
  "trade_links",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tradeId: integer("trade_id")
      .notNull()
      .references(() => trades.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    label: text("label"),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => [index("trade_links_trade_idx").on(table.tradeId)],
);

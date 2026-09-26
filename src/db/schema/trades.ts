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
import { importBatches } from "./import-batches.ts";
import { instruments } from "./instruments.ts";
import { users } from "./users.ts";

export const trades = pgTable(
  "trades",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tradeDate: date("trade_date").notNull(),
    instrumentId: integer("instrument_id")
      .notNull()
      .references(() => instruments.id),
    // false = missed setup. Not a second table (decisions.md).
    taken: boolean("taken").notNull(),
    // Contracts for a future, lots for a CFD — a CFD trades in fractions
    // like 1.88, so this is numeric at the precision of a price.
    contracts: numeric("contracts", { precision: 12, scale: 4 }),
    // Chart-clock times, never converted (coding-standards.md, Time).
    entryTime: time("entry_time").notNull(),
    exitTime: time("exit_time"),
    session: text("session"),
    direction: text("direction").notNull(),
    setupType: text("setup_type"),
    entryModel: text("entry_model"),
    entryPrice: numeric("entry_price", { precision: 13, scale: 5 }).notNull(),
    exitPrice: numeric("exit_price", { precision: 13, scale: 5 }),
    stopPrice: numeric("stop_price", { precision: 13, scale: 5 }),
    // The stop came from the import file, not from the user, so an undo may
    // still remove the trade. A hand edit of the stop sets it back to false.
    stopImported: boolean("stop_imported").notNull().default(false),
    mfeR: numeric("mfe_r", { precision: 8, scale: 2 }),
    maeR: numeric("mae_r", { precision: 8, scale: 2 }),
    // Manual field, shown only when a stop price is set — cannot be derived,
    // deriving it would need price data after the exit (project-overview.md).
    postExitMfeR: numeric("post_exit_mfe_r", { precision: 8, scale: 2 }),
    points: numeric("points", { precision: 13, scale: 5 }),
    pnlOverride: numeric("pnl_override", { precision: 14, scale: 2 }),
    // Set by an import whose file reports a P&L: that amount in the account's
    // currency. While it is set, `pnl_override` is the import's, not the
    // user's — an undo may remove the trade. A hand edit of the P&L clears it.
    pnlSource: numeric("pnl_source", { precision: 14, scale: 2 }),
    // Only on an account kept in another currency: the date of the ECB rate
    // `pnl_source` was converted into `pnl_override` with. The nightly job:fx
    // converts again while that rate is provisional (src/domain/fx.ts,
    // isProvisional). A hand edit of the P&L clears it with `pnl_source`.
    fxRateDate: date("fx_rate_date"),
    result: text("result"),
    grade: text("grade"),
    felt: text("felt"),
    byTheBook: boolean("by_the_book"),
    notes: text("notes"),
    // null = logged by hand. Set for every row an import writes, so a batch
    // can be undone without touching manual trades (current-feature.md).
    importBatchId: integer("import_batch_id").references(
      () => importBatches.id,
    ),
    // The broker's own identifier for this trade: a trade/order id from a
    // round-trip export, or a hash over the sorted fill ids that make up the
    // round trip. null when the file carries no stable id, which is the
    // normal case for a TradingView list — tier 2 handles those.
    brokerTradeKey: text("broker_trade_key"),
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
    // Tier 1 of the duplicate check reads exactly this pair.
    index("trades_user_broker_key_idx").on(table.userId, table.brokerTradeKey),
    index("trades_import_batch_idx").on(table.importBatchId),
  ],
);

export const tradeAccounts = pgTable(
  "trade_accounts",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tradeId: integer("trade_id")
      .notNull()
      .references(() => trades.id, { onDelete: "cascade" }),
    // No cascade: an account with trades is archived, never deleted. The
    // key is DEFERRABLE INITIALLY DEFERRED (hand-written migration 0013, not
    // expressible here) so deleting a user can cascade through `trades`
    // before the check runs.
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

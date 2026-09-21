import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { accounts } from "./accounts.ts";
import { users } from "./users.ts";

// One row per confirmed import. The batch exists so an import can be undone:
// without it, everything written before the column existed would have no batch
// and could never be removed (current-feature.md, §Batches).
//
// accountId is the single target account chosen in step 2 — an import never
// spreads one file across several accounts.
export const importBatches = pgTable(
  "import_batches",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id),
    // The name of the file the rows came from, or a fixed label for a paste.
    filename: text("filename").notNull(),
    // Rows written by this batch: new plus updated, not the skipped ones.
    rowCount: integer("row_count").notNull(),
    // Which shape detect.ts recognised: round-trip rows, individual fills or a
    // TradingView list. Stored so the batch list can say what it read.
    detectedShape: text("detected_shape").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("import_batches_user_idx").on(table.userId, table.id)],
);

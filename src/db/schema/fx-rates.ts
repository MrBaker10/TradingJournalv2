import { date, numeric, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

// ECB reference rates, one row per currency and publishing day. No row for a
// weekend or TARGET holiday — src/domain/fx.ts carries the previous rate over.
// Filled on demand by ensureFxRates when an import needs a rate
// (decisions.md).
export const fxRates = pgTable(
  "fx_rates",
  {
    currency: text("currency").notNull(),
    rateDate: date("rate_date").notNull(),
    // USD per one unit of `currency`.
    rateVsUsd: numeric("rate_vs_usd", { precision: 12, scale: 6 }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.currency, table.rateDate] })],
);

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
    rateVsUsd: numeric("rate_vs_usd", { precision: 18, scale: 10 }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.currency, table.rateDate] })],
);

// The stretches of days a fetch has covered, per currency (fx-fetch-coverage):
// from the start of the fetch window to the last rate it returned. Every rate
// the ECB published inside one is stored, so a day without a row there is a
// day the ECB did not publish. A later stored rate alone proves nothing — two
// fetches at different times can leave unfetched days between them.
export const fxFetchRanges = pgTable(
  "fx_fetch_ranges",
  {
    currency: text("currency").notNull(),
    coveredFrom: date("covered_from").notNull(),
    coveredTo: date("covered_to").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.currency, table.coveredFrom, table.coveredTo],
    }),
  ],
);

import { integer, numeric, pgTable, text } from "drizzle-orm/pg-core";

export const instruments = pgTable("instruments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  // One of ASSET_CLASSES in src/domain/instruments.ts. The default only
  // carries the rows that existed before the column; the seeder sets it.
  assetClass: text("asset_class").notNull().default("future"),
  // The currency points × quantity × point value is in: the quote currency
  // for a CFD like USDJPY or GER40.cash, USD for every future.
  profitCurrency: text("profit_currency").notNull().default("USD"),
  pointValue: numeric("point_value", { precision: 12, scale: 4 }).notNull(),
  tickSize: numeric("tick_size", { precision: 12, scale: 5 }).notNull(),
});

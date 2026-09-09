import { integer, numeric, pgTable, text } from "drizzle-orm/pg-core";

export const instruments = pgTable("instruments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  pointValue: numeric("point_value", { precision: 12, scale: 4 }).notNull(),
  tickSize: numeric("tick_size", { precision: 12, scale: 4 }).notNull(),
});

import { index, integer, pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { users } from "./users.ts";

export const checklistPhase = pgEnum("checklist_phase", [
  "premarket",
  "trading",
  "review",
]);

export const checklistTemplateItems = pgTable(
  "checklist_template_items",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    phase: checklistPhase("phase").notNull(),
    text: text("text").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [
    index("checklist_template_items_user_phase_idx").on(
      table.userId,
      table.phase,
      table.position,
    ),
  ],
);

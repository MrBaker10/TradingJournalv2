import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
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

// Only ticked steps are recorded per day. Phase and text are copied at tick
// time, so earlier days keep what was done even after the template item is
// renamed or deleted (the reference is then cleared). `check_date` is the
// user's own calendar day, like `daily_notes.note_date`.
export const dailyChecklistChecks = pgTable(
  "daily_checklist_checks",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    checkDate: date("check_date").notNull(),
    itemId: integer("item_id").references(() => checklistTemplateItems.id, {
      onDelete: "set null",
    }),
    phase: checklistPhase("phase").notNull(),
    text: text("text").notNull(),
    checkedAt: timestamp("checked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("daily_checklist_checks_user_date_item_unique").on(
      table.userId,
      table.checkDate,
      table.itemId,
    ),
  ],
);

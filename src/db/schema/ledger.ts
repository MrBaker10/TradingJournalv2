import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { EXPENSE_CATEGORIES, LEDGER_KINDS } from "../../domain/ledger.ts";
import { accounts } from "./accounts.ts";
import { users } from "./users.ts";

// Real money around the user's prop trading, entered by hand (GLOSSARY.md,
// Ledger). Never read by trading P&L, the equity curve, the calendar or
// progress (docs/adr/0002).
export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Optional: a data feed belongs to no account. RESTRICT: an account with
    // ledger entries is archived, never deleted, like one with trades. Unlike
    // `trade_accounts` (0013) the key needs no deferral: the cascade from
    // `users` reaches this table directly, while `trade_accounts` sits behind
    // `trades`. Pinned by user-deletion.test.ts, see decisions.md (Ledger,
    // Ticket 01).
    accountId: integer("account_id").references(() => accounts.id, {
      onDelete: "restrict",
    }),
    entryDate: date("entry_date").notNull(),
    kind: text("kind", { enum: LEDGER_KINDS }).notNull(),
    // Present exactly when the kind is expense.
    category: text("category", { enum: EXPENSE_CATEGORIES }),
    // USD, never negative: the kind carries the sign.
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("ledger_entries_user_date_idx").on(table.userId, table.entryDate),
    index("ledger_entries_account_idx").on(table.accountId),
    check(
      "ledger_entries_kind_check",
      sql.raw(`kind in (${LEDGER_KINDS.map((k) => `'${k}'`).join(", ")})`),
    ),
    check(
      "ledger_entries_category_check",
      sql.raw(
        `(kind = 'expense' and category in (${EXPENSE_CATEGORIES.map((c) => `'${c}'`).join(", ")})) or (kind <> 'expense' and category is null)`,
      ),
    ),
    check("ledger_entries_amount_check", sql`amount >= 0`),
  ],
);

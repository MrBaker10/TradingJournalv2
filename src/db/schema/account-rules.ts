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
import { DRAWDOWN_TYPES } from "../../domain/account-rules.ts";
import { accounts } from "./accounts.ts";
import { propFirmPrograms } from "./prop-firms.ts";

// The rules a real account was bought under, entered by the user when linking
// it to a prop firm program (GLOSSARY.md, Account rules). Copied, never read
// from the program's text: re-seeding a program never moves an account's rules
// (docs/adr/0001). Money in USD, like every prop firm limit.
//
// No `user_id`, like `account_commission_rates`: the row belongs to its
// account, and every read joins `accounts` filtered by user.
export const accountRules = pgTable(
  "account_rules",
  {
    // At most one link per account: the account is the key.
    accountId: integer("account_id")
      .primaryKey()
      .references(() => accounts.id, { onDelete: "cascade" }),
    // RESTRICT: the seeder only inserts and updates, so a linked program can
    // only go away by hand, and then not silently.
    programId: integer("program_id")
      .notNull()
      .references(() => propFirmPrograms.id, { onDelete: "restrict" }),
    evaluationStart: date("evaluation_start").notNull(),
    profitTarget: numeric("profit_target", {
      precision: 14,
      scale: 2,
    }).notNull(),
    drawdownAmount: numeric("drawdown_amount", {
      precision: 14,
      scale: 2,
    }).notNull(),
    drawdownType: text("drawdown_type", { enum: DRAWDOWN_TYPES }).notNull(),
    // The balance at which an EOD trailing floor stops trailing.
    lockLevel: numeric("lock_level", { precision: 14, scale: 2 }),
    dailyLossLimit: numeric("daily_loss_limit", { precision: 14, scale: 2 }),
    consistencyPercent: integer("consistency_percent"),
    minTradingDays: integer("min_trading_days"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("account_rules_program_idx").on(table.programId),
    check(
      "account_rules_drawdown_type_check",
      sql.raw(
        `drawdown_type in (${DRAWDOWN_TYPES.map((t) => `'${t}'`).join(", ")})`,
      ),
    ),
    check(
      "account_rules_lock_level_check",
      sql`lock_level is null or (drawdown_type = 'eod_trailing' and lock_level > 0)`,
    ),
    check(
      "account_rules_amounts_check",
      sql`profit_target > 0 and drawdown_amount > 0 and (daily_loss_limit is null or daily_loss_limit > 0)`,
    ),
    check(
      "account_rules_consistency_check",
      sql`consistency_percent is null or consistency_percent between 1 and 100`,
    ),
    check(
      "account_rules_min_days_check",
      sql`min_trading_days is null or min_trading_days >= 1`,
    ),
  ],
);

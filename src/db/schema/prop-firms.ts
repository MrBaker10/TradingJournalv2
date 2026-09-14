import { date, integer, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

// Reference data, not user data: there is no user_id here and no per-user
// filter, the same way `instruments` works. The rows come from
// `context/PropFirmsData.md` through src/db/seed-propfirms.ts, which is a
// seeder and not a migration — rules change when firms change them, and
// migrations stay immutable (project-overview.md, Decisions).
export const propFirms = pgTable("prop_firms", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  // The natural key the seeder upserts on, and the heading in the markdown.
  name: text("name").notNull().unique(),
  // Neither is curated in the file yet. Null means unknown, and the page says
  // so rather than showing nothing.
  website: text("website"),
  lastVerifiedAt: date("last_verified_at"),
});

// Every rule field is `text`, including the ones that look numeric. The source
// writes "$2,000 (EOD)", "None", "No stated cap" and "0", and pulling a number
// out of that would mean interpreting the rule. The app never does
// (project-overview.md, H). Prop firm limits also stay in USD and are never
// converted (coding-standards.md, Money).
export const propFirmPrograms = pgTable(
  "prop_firm_programs",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    firmId: integer("firm_id")
      .notNull()
      .references(() => propFirms.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // The firm's own short form of the program ("EOD", "90% split", "No DLL"),
    // taken verbatim from the summary lines above the rule table. This is what
    // the filter chips are built from — nothing is derived from the eighteen
    // fields below.
    summaryTags: text("summary_tags").array().notNull().default([]),
    accountSize: text("account_size"),
    profitTarget: text("profit_target"),
    maxDrawdown: text("max_drawdown"),
    dailyLossLimit: text("daily_loss_limit"),
    minTradingDays: text("min_trading_days"),
    consistencyRule: text("consistency_rule"),
    consistencyWhenFunded: text("consistency_when_funded"),
    newsTrading: text("news_trading"),
    overnight: text("overnight"),
    copyTrading: text("copy_trading"),
    firstPayout: text("first_payout"),
    payoutCycle: text("payout_cycle"),
    maxPayoutCycle: text("max_payout_cycle"),
    profitSplit: text("profit_split"),
    liveProgram: text("live_program"),
    scaling: text("scaling"),
    endOfDayRule: text("end_of_day_rule"),
    notes: text("notes"),
  },
  (table) => [
    // Firm plus program is what the seeder upserts on, so re-running it updates
    // in place instead of piling up duplicates.
    uniqueIndex("prop_firm_programs_firm_name_unique").on(
      table.firmId,
      table.name,
    ),
  ],
);

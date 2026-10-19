CREATE TABLE "account_rules" (
	"account_id" integer PRIMARY KEY NOT NULL,
	"program_id" integer NOT NULL,
	"evaluation_start" date NOT NULL,
	"profit_target" numeric(14, 2) NOT NULL,
	"drawdown_amount" numeric(14, 2) NOT NULL,
	"drawdown_type" text NOT NULL,
	"lock_level" numeric(14, 2),
	"daily_loss_limit" numeric(14, 2),
	"consistency_percent" integer,
	"min_trading_days" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_rules_drawdown_type_check" CHECK (drawdown_type in ('static', 'eod_trailing', 'intraday_trailing')),
	CONSTRAINT "account_rules_lock_level_check" CHECK (lock_level is null or (drawdown_type = 'eod_trailing' and lock_level > 0)),
	CONSTRAINT "account_rules_amounts_check" CHECK (profit_target > 0 and drawdown_amount > 0 and (daily_loss_limit is null or daily_loss_limit > 0)),
	CONSTRAINT "account_rules_consistency_check" CHECK (consistency_percent is null or consistency_percent between 1 and 100),
	CONSTRAINT "account_rules_min_days_check" CHECK (min_trading_days is null or min_trading_days >= 1)
);
--> statement-breakpoint
ALTER TABLE "account_rules" ADD CONSTRAINT "account_rules_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_rules" ADD CONSTRAINT "account_rules_program_id_prop_firm_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."prop_firm_programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_rules_program_idx" ON "account_rules" USING btree ("program_id");
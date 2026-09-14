CREATE TABLE "prop_firm_programs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "prop_firm_programs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"firm_id" integer NOT NULL,
	"name" text NOT NULL,
	"summary_tags" text[] DEFAULT '{}' NOT NULL,
	"account_size" text,
	"profit_target" text,
	"max_drawdown" text,
	"daily_loss_limit" text,
	"min_trading_days" text,
	"consistency_rule" text,
	"consistency_when_funded" text,
	"news_trading" text,
	"overnight" text,
	"copy_trading" text,
	"first_payout" text,
	"payout_cycle" text,
	"max_payout_cycle" text,
	"profit_split" text,
	"live_program" text,
	"scaling" text,
	"end_of_day_rule" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "prop_firms" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "prop_firms_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"website" text,
	"last_verified_at" date,
	CONSTRAINT "prop_firms_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "prop_firm_programs" ADD CONSTRAINT "prop_firm_programs_firm_id_prop_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."prop_firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "prop_firm_programs_firm_name_unique" ON "prop_firm_programs" USING btree ("firm_id","name");
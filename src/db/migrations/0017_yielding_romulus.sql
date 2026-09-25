ALTER TABLE "accounts" ADD COLUMN "starting_balance" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "starting_balance_usd" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "starting_balance_rate_date" date;
ALTER TABLE "prop_firm_programs" ADD COLUMN "position" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "prop_firm_programs" ADD COLUMN "account_size_usd" numeric(14, 2);
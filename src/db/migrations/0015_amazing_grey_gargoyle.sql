ALTER TABLE "trades" ALTER COLUMN "contracts" SET DATA TYPE numeric(12, 4);--> statement-breakpoint
ALTER TABLE "trades" ADD COLUMN "pnl_source" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "trades" ADD COLUMN "fx_rate_date" date;
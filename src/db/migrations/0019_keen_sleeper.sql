ALTER TABLE "fx_rates" ALTER COLUMN "rate_vs_usd" SET DATA TYPE numeric(18, 10);--> statement-breakpoint
ALTER TABLE "instruments" ALTER COLUMN "tick_size" SET DATA TYPE numeric(12, 5);--> statement-breakpoint
ALTER TABLE "trades" ALTER COLUMN "entry_price" SET DATA TYPE numeric(13, 5);--> statement-breakpoint
ALTER TABLE "trades" ALTER COLUMN "exit_price" SET DATA TYPE numeric(13, 5);--> statement-breakpoint
ALTER TABLE "trades" ALTER COLUMN "stop_price" SET DATA TYPE numeric(13, 5);--> statement-breakpoint
ALTER TABLE "trades" ALTER COLUMN "points" SET DATA TYPE numeric(13, 5);--> statement-breakpoint
ALTER TABLE "instruments" ADD COLUMN "asset_class" text DEFAULT 'future' NOT NULL;--> statement-breakpoint
ALTER TABLE "instruments" ADD COLUMN "profit_currency" text DEFAULT 'USD' NOT NULL;
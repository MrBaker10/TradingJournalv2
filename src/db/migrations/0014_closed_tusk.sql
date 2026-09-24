CREATE TABLE "fx_rates" (
	"currency" text NOT NULL,
	"rate_date" date NOT NULL,
	"rate_vs_usd" numeric(12, 6) NOT NULL,
	CONSTRAINT "fx_rates_currency_rate_date_pk" PRIMARY KEY("currency","rate_date")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_currency_check" CHECK (currency in ('USD', 'EUR'));
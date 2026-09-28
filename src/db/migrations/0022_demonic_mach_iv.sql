CREATE TABLE "account_commission_rates" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "account_commission_rates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"account_id" integer NOT NULL,
	"instrument_id" integer NOT NULL,
	"per_side" numeric(10, 2) NOT NULL,
	CONSTRAINT "account_commission_rates_per_side_check" CHECK (per_side >= 0)
);
--> statement-breakpoint
ALTER TABLE "trade_accounts" ADD COLUMN "commission" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "trade_accounts" ADD COLUMN "commission_source" text;--> statement-breakpoint
ALTER TABLE "account_commission_rates" ADD CONSTRAINT "account_commission_rates_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_commission_rates" ADD CONSTRAINT "account_commission_rates_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_commission_rates_unique" ON "account_commission_rates" USING btree ("account_id","instrument_id");--> statement-breakpoint
ALTER TABLE "trade_accounts" ADD CONSTRAINT "trade_accounts_commission_check" CHECK ((commission is null and commission_source is null) or (commission >= 0 and commission_source in ('file', 'rate', 'manual')));
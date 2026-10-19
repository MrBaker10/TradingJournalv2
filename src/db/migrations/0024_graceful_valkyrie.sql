CREATE TABLE "ledger_entries" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ledger_entries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"account_id" integer,
	"entry_date" date NOT NULL,
	"kind" text NOT NULL,
	"category" text,
	"amount" numeric(14, 2) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_entries_kind_check" CHECK (kind in ('expense', 'payout')),
	CONSTRAINT "ledger_entries_category_check" CHECK ((kind = 'expense' and category in ('evaluation', 'reset', 'activation', 'subscription', 'data', 'other')) or (kind <> 'expense' and category is null)),
	CONSTRAINT "ledger_entries_amount_check" CHECK (amount >= 0)
);
--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ledger_entries_user_date_idx" ON "ledger_entries" USING btree ("user_id","entry_date");--> statement-breakpoint
CREATE INDEX "ledger_entries_account_idx" ON "ledger_entries" USING btree ("account_id");
CREATE TABLE "accounts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "accounts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer NOT NULL,
	"is_default_for_new_trades" boolean DEFAULT false NOT NULL,
	"is_practice" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_user_default_unique" ON "accounts" USING btree ("user_id") WHERE "accounts"."is_default_for_new_trades" = true;--> statement-breakpoint
CREATE INDEX "accounts_user_sort_idx" ON "accounts" USING btree ("user_id","sort_order");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_selected_account_id_accounts_id_fk" FOREIGN KEY ("selected_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
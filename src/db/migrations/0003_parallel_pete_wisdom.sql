CREATE TABLE "confluence_tags" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "confluence_tags_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"group" text NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mistake_tags" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mistake_tags_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"label" text NOT NULL,
	CONSTRAINT "mistake_tags_label_unique" UNIQUE("label")
);
--> statement-breakpoint
CREATE TABLE "trade_accounts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trade_accounts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"trade_id" integer NOT NULL,
	"account_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_confluences" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trade_confluences_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"trade_id" integer NOT NULL,
	"confluence_tag_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_mistakes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trade_mistakes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"trade_id" integer NOT NULL,
	"mistake_tag_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trades_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"trade_date" date NOT NULL,
	"instrument_id" integer NOT NULL,
	"taken" boolean NOT NULL,
	"contracts" integer,
	"entry_time" time NOT NULL,
	"exit_time" time,
	"session" text,
	"direction" text NOT NULL,
	"setup_type" text,
	"entry_model" text,
	"entry_price" numeric(12, 4) NOT NULL,
	"exit_price" numeric(12, 4),
	"stop_price" numeric(12, 4),
	"mfe_r" numeric(8, 2),
	"mae_r" numeric(8, 2),
	"post_exit_mfe_r" numeric(8, 2),
	"points" numeric(12, 4),
	"pnl_override" numeric(14, 2),
	"result" text,
	"grade" text,
	"felt" text,
	"by_the_book" boolean,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trade_accounts" ADD CONSTRAINT "trade_accounts_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_accounts" ADD CONSTRAINT "trade_accounts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_confluences" ADD CONSTRAINT "trade_confluences_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_confluences" ADD CONSTRAINT "trade_confluences_confluence_tag_id_confluence_tags_id_fk" FOREIGN KEY ("confluence_tag_id") REFERENCES "public"."confluence_tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_mistakes" ADD CONSTRAINT "trade_mistakes_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_mistakes" ADD CONSTRAINT "trade_mistakes_mistake_tag_id_mistake_tags_id_fk" FOREIGN KEY ("mistake_tag_id") REFERENCES "public"."mistake_tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_instrument_id_instruments_id_fk" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "confluence_tags_group_label_unique" ON "confluence_tags" USING btree ("group","label");--> statement-breakpoint
CREATE UNIQUE INDEX "trade_accounts_unique" ON "trade_accounts" USING btree ("trade_id","account_id");--> statement-breakpoint
CREATE INDEX "trade_accounts_account_idx" ON "trade_accounts" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trade_confluences_unique" ON "trade_confluences" USING btree ("trade_id","confluence_tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trade_mistakes_unique" ON "trade_mistakes" USING btree ("trade_id","mistake_tag_id");--> statement-breakpoint
CREATE INDEX "trades_user_date_idx" ON "trades" USING btree ("user_id","trade_date");--> statement-breakpoint
CREATE INDEX "trades_user_taken_idx" ON "trades" USING btree ("user_id","taken");
CREATE TABLE "trade_links" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trade_links_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"trade_id" integer NOT NULL,
	"url" text NOT NULL,
	"label" text,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_screenshots" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trade_screenshots_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"trade_id" integer NOT NULL,
	"storage_key" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trade_links" ADD CONSTRAINT "trade_links_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_screenshots" ADD CONSTRAINT "trade_screenshots_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trade_links_trade_idx" ON "trade_links" USING btree ("trade_id");--> statement-breakpoint
CREATE INDEX "trade_screenshots_trade_idx" ON "trade_screenshots" USING btree ("trade_id");
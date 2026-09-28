CREATE TABLE "econ_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "econ_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"occurs_at" timestamp with time zone NOT NULL,
	"currency" text NOT NULL,
	"title" text NOT NULL,
	"impact" text NOT NULL,
	"forecast" text,
	"previous" text
);
--> statement-breakpoint
CREATE INDEX "econ_events_occurs_at_idx" ON "econ_events" USING btree ("occurs_at");
CREATE TABLE "daily_checklist_checks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "daily_checklist_checks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"check_date" date NOT NULL,
	"item_id" integer,
	"phase" "checklist_phase" NOT NULL,
	"text" text NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_checklist_checks" ADD CONSTRAINT "daily_checklist_checks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_checklist_checks" ADD CONSTRAINT "daily_checklist_checks_item_id_checklist_template_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."checklist_template_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_checklist_checks_user_date_item_unique" ON "daily_checklist_checks" USING btree ("user_id","check_date","item_id");
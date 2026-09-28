CREATE TABLE "monthly_scores" (
	"user_id" integer NOT NULL,
	"month" text NOT NULL,
	"score" integer NOT NULL,
	"showing_up" numeric(7, 4) NOT NULL,
	"completeness" numeric(7, 4) NOT NULL,
	"plan_adherence" numeric(7, 4) NOT NULL,
	"review_habit" numeric(7, 4) NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monthly_scores_user_id_month_pk" PRIMARY KEY("user_id","month"),
	CONSTRAINT "monthly_scores_month_check" CHECK ("monthly_scores"."month" ~ '^\d{4}-\d{2}$'),
	CONSTRAINT "monthly_scores_score_check" CHECK ("monthly_scores"."score" between 0 and 100)
);
--> statement-breakpoint
ALTER TABLE "monthly_scores" ADD CONSTRAINT "monthly_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
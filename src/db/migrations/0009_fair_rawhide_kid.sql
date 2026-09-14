ALTER TABLE "users" ADD COLUMN "dashboard_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "streak_milestone_seen" integer;
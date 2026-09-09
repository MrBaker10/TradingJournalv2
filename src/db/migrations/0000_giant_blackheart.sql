CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"discord_username" text,
	"timezone" text NOT NULL,
	"currency_display" text DEFAULT 'USD' NOT NULL,
	"selected_account_id" integer,
	"password_hash" text,
	"totp_secret" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);

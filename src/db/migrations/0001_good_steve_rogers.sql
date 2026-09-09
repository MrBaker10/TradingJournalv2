CREATE TABLE "instruments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "instruments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"symbol" text NOT NULL,
	"name" text NOT NULL,
	"point_value" numeric(12, 4) NOT NULL,
	"tick_size" numeric(12, 4) NOT NULL,
	CONSTRAINT "instruments_symbol_unique" UNIQUE("symbol")
);

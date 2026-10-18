CREATE TABLE "fx_fetch_ranges" (
	"currency" text NOT NULL,
	"covered_from" date NOT NULL,
	"covered_to" date NOT NULL,
	CONSTRAINT "fx_fetch_ranges_currency_covered_from_covered_to_pk" PRIMARY KEY("currency","covered_from","covered_to")
);

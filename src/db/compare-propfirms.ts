import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq, sql } from "drizzle-orm";
import { env } from "../lib/env.ts";
import {
  type CatalogueRows,
  compareCatalogue,
} from "../lib/prop-firms/compare.ts";
import {
  PROGRAM_FIELD_LABELS,
  type ProgramFields,
  parsePropFirms,
} from "../lib/prop-firms/parse.ts";
import { db } from "./index.ts";
import { propFirmPrograms, propFirms } from "./schema/prop-firms.ts";

const SOURCE = "context/PropFirmsData.md";

// Proves that the database DATABASE_URL points at holds what a seed of the
// file leaves there (docs/adr/0005). Read-only: the transaction is opened
// read only, so even a mistake here cannot write. Exit code 1 on any
// difference, so the data refresh can stop on it.
async function compare() {
  console.log(`Comparing ${SOURCE} with ${new URL(env.DATABASE_URL).host}.`);
  const file = parsePropFirms(
    readFileSync(join(process.cwd(), SOURCE), "utf8"),
  );
  const rows = await readCatalogue();
  const differences = compareCatalogue(file, rows);

  for (const { firm, program, issue } of differences) {
    console.log(
      program ? `${firm} · ${program}: ${issue}` : `${firm}: ${issue}`,
    );
  }
  if (differences.length > 0) {
    const count = differences.length;
    console.log(`${count} ${count === 1 ? "difference" : "differences"}.`);
    process.exit(1);
  }
  const discontinued = rows.programs.filter(
    (row) => row.discontinuedAt !== null,
  ).length;
  console.log(
    `Match: ${file.length} firms, ${rows.programs.length - discontinued} programs on sale, ${discontinued} discontinued.`,
  );
  process.exit(0);
}

// Firms and programs in the shape the parser gives them, in one read-only
// transaction.
async function readCatalogue(): Promise<CatalogueRows> {
  const { firms, programs } = await db.transaction(
    async (tx) => ({
      firms: await tx
        .select({
          name: propFirms.name,
          website: propFirms.website,
          lastVerifiedAt: propFirms.lastVerifiedAt,
        })
        .from(propFirms),
      programs: await tx
        .select({
          firmName: propFirms.name,
          program: propFirmPrograms,
          // `numeric` keeps its scale ("50000.00"); the parser writes whole
          // dollars ("50000").
          accountSizeUsd: sql<
            string | null
          >`trim_scale(${propFirmPrograms.accountSizeUsd})::text`,
        })
        .from(propFirmPrograms)
        .innerJoin(propFirms, eq(propFirms.id, propFirmPrograms.firmId)),
    }),
    { accessMode: "read only" },
  );

  return {
    firms,
    programs: programs.map(({ firmName, program, accountSizeUsd }) => {
      const fields = {} as ProgramFields;
      for (const [key] of PROGRAM_FIELD_LABELS) fields[key] = program[key];
      return {
        id: program.id,
        firmName,
        name: program.name,
        position: program.position,
        accountSizeUsd,
        summaryTags: program.summaryTags,
        fields,
        discontinuedAt: program.discontinuedAt,
      };
    }),
  };
}

compare().catch((error) => {
  console.error(error);
  process.exit(1);
});

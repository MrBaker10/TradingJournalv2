import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parsePropFirms } from "../lib/prop-firms/parse.ts";
import { db } from "./index.ts";
import { propFirmPrograms, propFirms } from "./schema/prop-firms.ts";

const SOURCE = "context/PropFirmsData.md";

// Idempotent: the markdown is the source of record, `name` is the natural key
// for a firm and `(firm_id, name)` for a program, so re-running updates in
// place. Not a migration, because rules change when firms change them and
// migrations stay immutable (project-overview.md, Decisions).
//
// It inserts and updates, it does not clean up: a firm removed from the file
// keeps its row. Deleting rows is not this script's job.
async function seed() {
  const markdown = readFileSync(join(process.cwd(), SOURCE), "utf8");
  const firms = parsePropFirms(markdown);

  let programCount = 0;

  for (const firm of firms) {
    const [row] = await db
      .insert(propFirms)
      .values({
        name: firm.name,
        website: firm.website,
        lastVerifiedAt: firm.lastVerifiedAt,
      })
      .onConflictDoUpdate({
        target: propFirms.name,
        set: { website: firm.website, lastVerifiedAt: firm.lastVerifiedAt },
      })
      .returning({ id: propFirms.id });

    for (const program of firm.programs) {
      await db
        .insert(propFirmPrograms)
        .values({
          firmId: row.id,
          name: program.name,
          summaryTags: program.summaryTags,
          ...program.fields,
        })
        .onConflictDoUpdate({
          target: [propFirmPrograms.firmId, propFirmPrograms.name],
          set: { summaryTags: program.summaryTags, ...program.fields },
        });
      programCount += 1;
    }
  }

  console.log(`Seeded ${firms.length} firms and ${programCount} programs.`);
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});

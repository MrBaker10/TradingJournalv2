import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq, inArray } from "drizzle-orm";
import { decideDiscontinued } from "../lib/prop-firms/discontinued.ts";
import { type ParsedFirm, parsePropFirms } from "../lib/prop-firms/parse.ts";
import { db } from "./index.ts";
import { propFirmPrograms, propFirms } from "./schema/prop-firms.ts";

const SOURCE = "context/PropFirmsData.md";

// Idempotent: the markdown is the source of record, `name` is the natural key
// for a firm and `(firm_id, name)` for a program, so re-running updates in
// place. Not a migration, because rules change when firms change them and
// migrations stay immutable (project-overview.md, Decisions).
//
// It inserts and updates, it never deletes: a program removed from the file,
// or every program of a firm removed from it, is marked discontinued and
// keeps its row, so linked accounts keep their link. Back in the file, it is
// on sale again (docs/adr/0005).
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
      const columns = {
        position: program.position,
        accountSizeUsd: program.accountSizeUsd,
        summaryTags: program.summaryTags,
        ...program.fields,
      };
      await db
        .insert(propFirmPrograms)
        .values({ firmId: row.id, name: program.name, ...columns })
        .onConflictDoUpdate({
          target: [propFirmPrograms.firmId, propFirmPrograms.name],
          set: columns,
        });
      programCount += 1;
    }
  }

  const { discontinue, putOnSale } = await markDiscontinued(firms);

  console.log(
    `Seeded ${firms.length} firms and ${programCount} programs; ` +
      `${discontinue.length} discontinued, ${putOnSale.length} back on sale.`,
  );
  process.exit(0);
}

// Marks what the file no longer lists and puts back on sale what it lists
// again, as `decideDiscontinued` decides. Runs after the upserts, so a program
// new in the file is already a row and counts as on sale.
async function markDiscontinued(firms: ParsedFirm[]) {
  const existing = await db
    .select({
      id: propFirmPrograms.id,
      firmName: propFirms.name,
      programName: propFirmPrograms.name,
      discontinuedAt: propFirmPrograms.discontinuedAt,
    })
    .from(propFirmPrograms)
    .innerJoin(propFirms, eq(propFirms.id, propFirmPrograms.firmId));
  const decision = decideDiscontinued(firms, existing);

  if (decision.discontinue.length > 0) {
    await db
      .update(propFirmPrograms)
      .set({ discontinuedAt: new Date() })
      .where(inArray(propFirmPrograms.id, decision.discontinue));
  }
  if (decision.putOnSale.length > 0) {
    await db
      .update(propFirmPrograms)
      .set({ discontinuedAt: null })
      .where(inArray(propFirmPrograms.id, decision.putOnSale));
  }
  return decision;
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});

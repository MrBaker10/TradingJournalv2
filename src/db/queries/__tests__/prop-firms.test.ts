import { sql, TransactionRollbackError } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../index.ts";
import { propFirmPrograms, propFirms } from "../../schema/prop-firms.ts";
import { listProgramOptions, listPropFirms } from "../prop-firms.ts";

// The prop firm reference lists (prop-firm-sizes). Every case runs in a
// rolled-back transaction on a firm of its own, so the seeded firms never
// interfere and nothing is left behind.

let dbReachable = false;

beforeAll(async () => {
  try {
    await db.execute(sql`select 1`);
    dbReachable = true;
  } catch {
    dbReachable = false;
  }
});

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function inRollback<T>(body: (tx: Tx) => Promise<T>): Promise<T> {
  let result: T | undefined;
  try {
    await db.transaction(async (tx) => {
      result = await body(tx);
      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }
  return result as T;
}

// Both names carry the search term, so a search isolates them from the seeded
// firms. The second one sorts first by name but is inserted last.
const SEARCH = "list test firm";
const FIRM = "Prop firm list test firm";
const EARLIER_FIRM = "Another list test firm";

// Inserted out of order on purpose: by name the sizes would read 100k, 25k,
// 50k; the file order the curator wrote is 25k, 50k, 100k.
async function firmsWithSizes(tx: Tx) {
  const [firm] = await tx
    .insert(propFirms)
    .values({ name: FIRM })
    .returning({ id: propFirms.id });
  await tx.insert(propFirmPrograms).values([
    { firmId: firm.id, name: "Select 100k", position: 3 },
    { firmId: firm.id, name: "Select 25k", position: 1 },
    { firmId: firm.id, name: "Select 50k", position: 2 },
  ]);
  const [earlier] = await tx
    .insert(propFirms)
    .values({ name: EARLIER_FIRM })
    .returning({ id: propFirms.id });
  await tx
    .insert(propFirmPrograms)
    .values({ firmId: earlier.id, name: "Rapid 150k", position: 1 });
}

const EXPECTED = [
  `${EARLIER_FIRM} · Rapid 150k`,
  `${FIRM} · Select 25k`,
  `${FIRM} · Select 50k`,
  `${FIRM} · Select 100k`,
];

describe("prop firm lists", () => {
  it("lists by firm name, then each firm's programs in file order", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const names = await inRollback(async (tx) => {
      await firmsWithSizes(tx);
      const rows = await listPropFirms({ search: SEARCH }, tx);
      return rows.map((row) => `${row.firm.name} · ${row.program.name}`);
    });

    expect(names).toEqual(EXPECTED);
  });

  it("offers programs by firm, then in file order, in the program select", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const names = await inRollback(async (tx) => {
      await firmsWithSizes(tx);
      const options = await listProgramOptions(tx);
      return options
        .filter((option) => option.firmName.endsWith(SEARCH))
        .map((option) => `${option.firmName} · ${option.name}`);
    });

    expect(names).toEqual(EXPECTED);
  });
});

import { sql, TransactionRollbackError } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../index.ts";
import { propFirmPrograms, propFirms } from "../../schema/prop-firms.ts";
import {
  listAccountSizes,
  listProgramOptions,
  listPropFirms,
} from "../prop-firms.ts";

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

  it("returns the account size in whole cents, and null when it is unknown", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const sizes = await inRollback(async (tx) => {
      const [firm] = await tx
        .insert(propFirms)
        .values({ name: FIRM })
        .returning({ id: propFirms.id });
      await tx.insert(propFirmPrograms).values([
        { firmId: firm.id, name: "Select 150k", accountSizeUsd: "150000.00" },
        {
          firmId: firm.id,
          name: "Select Custom",
          position: 2,
          accountSizeUsd: null,
        },
      ]);
      const rows = await listPropFirms({ search: SEARCH }, tx);
      return rows.map((row) => row.program.accountSizeCents);
    });

    expect(sizes).toEqual([15_000_000, null]);
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

// Sizes, tags and an unknown size side by side, so each filter group has
// something to keep and something to drop.
async function firmsForSizeFilter(tx: Tx) {
  const [firm] = await tx
    .insert(propFirms)
    .values({ name: FIRM })
    .returning({ id: propFirms.id });
  await tx.insert(propFirmPrograms).values([
    {
      firmId: firm.id,
      name: "Select 25k",
      position: 1,
      accountSizeUsd: "25000.00",
      summaryTags: ["EOD"],
    },
    {
      firmId: firm.id,
      name: "Select 50k",
      position: 2,
      accountSizeUsd: "50000.00",
      summaryTags: ["EOD", "No DLL"],
    },
    {
      firmId: firm.id,
      name: "Select 100k",
      position: 3,
      accountSizeUsd: "100000.00",
      summaryTags: ["Static"],
    },
    { firmId: firm.id, name: "Select Custom", position: 4 },
  ]);
  const [earlier] = await tx
    .insert(propFirms)
    .values({ name: EARLIER_FIRM })
    .returning({ id: propFirms.id });
  await tx.insert(propFirmPrograms).values({
    firmId: earlier.id,
    name: "Rapid 50k",
    position: 1,
    accountSizeUsd: "50000.00",
    summaryTags: ["EOD"],
  });
}

async function namesFor(filters: Parameters<typeof listPropFirms>[0]) {
  return inRollback(async (tx) => {
    await firmsForSizeFilter(tx);
    const rows = await listPropFirms({ search: SEARCH, ...filters }, tx);
    return rows.map((row) => `${row.firm.name} · ${row.program.name}`);
  });
}

describe("size filter", () => {
  it("keeps programs of any selected size", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    expect(await namesFor({ sizes: [25_000, 100_000] })).toEqual([
      `${FIRM} · Select 25k`,
      `${FIRM} · Select 100k`,
    ]);
  });

  it("narrows together with tags and search", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    // Two programs are 50k and both carry EOD; only Select 50k also carries
    // No DLL, and only Rapid 50k belongs to the firm searched for by name.
    expect(await namesFor({ sizes: [50_000], tags: ["No DLL"] })).toEqual([
      `${FIRM} · Select 50k`,
    ]);
    expect(
      await namesFor({ sizes: [50_000], search: EARLIER_FIRM, tags: ["EOD"] }),
    ).toEqual([`${EARLIER_FIRM} · Rapid 50k`]);
  });

  it("never matches a program whose size is unknown", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const names = await namesFor({ sizes: [25_000, 50_000, 100_000] });

    expect(names).not.toContain(`${FIRM} · Select Custom`);
    expect(await namesFor({})).toContain(`${FIRM} · Select Custom`);
  });

  it("offers every known size once, ascending, labelled in thousands", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const sizes = await inRollback(async (tx) => {
      await firmsForSizeFilter(tx);
      return listAccountSizes(tx);
    });

    const usd = sizes.map((size) => size.usd);
    expect(usd).toEqual([...new Set(usd)].sort((a, b) => a - b));
    expect(sizes).toEqual(
      expect.arrayContaining([
        { usd: 25_000, label: "25k" },
        { usd: 50_000, label: "50k" },
        { usd: 100_000, label: "100k" },
      ]),
    );
  });
});

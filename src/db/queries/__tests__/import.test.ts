import {
  and,
  asc,
  eq,
  inArray,
  sql,
  TransactionRollbackError,
} from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../index.ts";
import { accounts } from "../../schema/accounts.ts";
import { importBatches } from "../../schema/import-batches.ts";
import { instruments } from "../../schema/instruments.ts";
import {
  tradeAccounts,
  tradeLinks,
  tradeScreenshots,
  trades,
} from "../../schema/trades.ts";
import { users } from "../../schema/users.ts";
import {
  createImportBatch,
  type ImportedTrade,
  insertImportedTrades,
  listImportBatches,
  listMatchCandidates,
  removeUntouchedTrades,
  updateImportedTrades,
} from "../import.ts";

// Test-only symbol; every fixture runs inside a rolled-back transaction, so
// nothing here reaches the dev database.
const TEST_SYMBOL = "TEST-IMPORT-QUERIES";

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

interface Fixture {
  tx: Tx;
  userId: number;
  accountId: number;
  practiceAccountId: number;
  instrumentId: number;
}

/**
 * Runs `body` against real Postgres with a throwaway user-owned account and
 * instrument, then always rolls back.
 */
async function withFixture(body: (fixture: Fixture) => Promise<void>) {
  try {
    await db.transaction(async (tx) => {
      const [user] = await tx.select({ id: users.id }).from(users).limit(1);
      if (!user) {
        throw new Error("No seeded user — run `pnpm db:seed` first");
      }

      const [instrument] = await tx
        .insert(instruments)
        .values({
          symbol: TEST_SYMBOL,
          name: "Throwaway import instrument",
          pointValue: "2",
          tickSize: "0.25",
        })
        .returning({ id: instruments.id });

      const [account] = await tx
        .insert(accounts)
        .values({ userId: user.id, name: "Import target", sortOrder: 900 })
        .returning({ id: accounts.id });

      const [practice] = await tx
        .insert(accounts)
        .values({
          userId: user.id,
          name: "Import practice",
          sortOrder: 901,
          isPractice: true,
        })
        .returning({ id: accounts.id });

      await body({
        tx,
        userId: user.id,
        accountId: account.id,
        practiceAccountId: practice.id,
        instrumentId: instrument.id,
      });

      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }
}

function importedTrade(
  fixture: Fixture,
  batchId: number,
  overrides: Partial<ImportedTrade> = {},
): ImportedTrade {
  return {
    userId: fixture.userId,
    tradeDate: "2026-08-20",
    instrumentId: fixture.instrumentId,
    contracts: 2,
    entryTime: "09:30",
    exitTime: "09:45",
    direction: "long",
    entryPrice: 20000,
    exitPrice: 20050,
    points: 50,
    result: "Win",
    session: "NY-AM",
    stopPrice: null,
    pnl: null,
    brokerTradeKey: null,
    importBatchId: batchId,
    ...overrides,
  };
}

async function newBatch(fixture: Fixture, filename = "export.csv") {
  return createImportBatch(fixture.tx, {
    userId: fixture.userId,
    accountId: fixture.accountId,
    filename,
    rowCount: 1,
    detectedShape: "round-trip",
  });
}

describe("listMatchCandidates", () => {
  it("reads back what the import wrote, with numbers as numbers", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    await withFixture(async (fixture) => {
      const batchId = await newBatch(fixture);
      await insertImportedTrades(
        fixture.tx,
        [importedTrade(fixture, batchId, { brokerTradeKey: "abc|def" })],
        fixture.accountId,
      );

      const candidates = await listMatchCandidates(
        fixture.userId,
        fixture.accountId,
        ["2026-08-20"],
        fixture.tx,
      );

      expect(candidates).toHaveLength(1);
      expect(candidates[0]).toMatchObject({
        instrumentId: fixture.instrumentId,
        direction: "long",
        contracts: 2,
        tradeDate: "2026-08-20",
        entryPrice: 20000,
        exitPrice: 20050,
        points: 50,
        result: "Win",
        brokerTradeKey: "abc|def",
      });
      // numeric comes out of the driver as a string; the query converts.
      expect(typeof candidates[0].entryPrice).toBe("number");
    });
  });

  it("returns postgres time as HH:MM:SS, which outcome.ts normalises", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    await withFixture(async (fixture) => {
      const batchId = await newBatch(fixture);
      await insertImportedTrades(
        fixture.tx,
        [importedTrade(fixture, batchId, { entryTime: "09:30" })],
        fixture.accountId,
      );

      const [candidate] = await listMatchCandidates(
        fixture.userId,
        fixture.accountId,
        ["2026-08-20"],
        fixture.tx,
      );

      expect(candidate.entryTime).toBe("09:30:00");
    });
  });

  it("never reaches across accounts", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    await withFixture(async (fixture) => {
      const batchId = await newBatch(fixture);
      await insertImportedTrades(
        fixture.tx,
        [importedTrade(fixture, batchId)],
        fixture.accountId,
      );

      const other = await listMatchCandidates(
        fixture.userId,
        fixture.practiceAccountId,
        ["2026-08-20"],
        fixture.tx,
      );

      expect(other).toEqual([]);
    });
  });

  it("reads only the dates the file mentions", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    await withFixture(async (fixture) => {
      const batchId = await newBatch(fixture);
      await insertImportedTrades(
        fixture.tx,
        [importedTrade(fixture, batchId, { tradeDate: "2026-08-20" })],
        fixture.accountId,
      );

      const candidates = await listMatchCandidates(
        fixture.userId,
        fixture.accountId,
        ["2026-08-21"],
        fixture.tx,
      );

      expect(candidates).toEqual([]);
    });
  });

  it("leaves a missed setup out — it carries no account", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    await withFixture(async (fixture) => {
      await fixture.tx.insert(trades).values({
        userId: fixture.userId,
        tradeDate: "2026-08-20",
        instrumentId: fixture.instrumentId,
        taken: false,
        entryTime: "09:30",
        direction: "long",
        entryPrice: "20000",
      });

      const candidates = await listMatchCandidates(
        fixture.userId,
        fixture.accountId,
        ["2026-08-20"],
        fixture.tx,
      );

      expect(candidates).toEqual([]);
    });
  });

  it("has nothing to read without dates", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    await withFixture(async (fixture) => {
      const candidates = await listMatchCandidates(
        fixture.userId,
        fixture.accountId,
        [],
        fixture.tx,
      );
      expect(candidates).toEqual([]);
    });
  });
});

describe("insertImportedTrades", () => {
  it("assigns every trade to exactly one account", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    await withFixture(async (fixture) => {
      const batchId = await newBatch(fixture);
      const ids = await insertImportedTrades(
        fixture.tx,
        [
          importedTrade(fixture, batchId),
          importedTrade(fixture, batchId, { entryPrice: 20100 }),
        ],
        fixture.accountId,
      );

      const assignments = await fixture.tx
        .select({ count: sql<number>`count(*)::int` })
        .from(tradeAccounts)
        .where(eq(tradeAccounts.accountId, fixture.accountId));

      expect(ids).toHaveLength(2);
      expect(Number(assignments[0].count)).toBe(2);
    });
  });

  it("stores prices as numeric, not as a float", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    await withFixture(async (fixture) => {
      const batchId = await newBatch(fixture);
      const [id] = await insertImportedTrades(
        fixture.tx,
        [importedTrade(fixture, batchId, { entryPrice: 20000.25 })],
        fixture.accountId,
      );

      const [row] = await fixture.tx
        .select({ entryPrice: trades.entryPrice })
        .from(trades)
        .where(eq(trades.id, id));

      expect(row.entryPrice).toBe("20000.2500");
    });
  });

  it("marks every imported trade as taken", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    await withFixture(async (fixture) => {
      const batchId = await newBatch(fixture);
      const [id] = await insertImportedTrades(
        fixture.tx,
        [importedTrade(fixture, batchId)],
        fixture.accountId,
      );

      const [row] = await fixture.tx
        .select({ taken: trades.taken, batch: trades.importBatchId })
        .from(trades)
        .where(eq(trades.id, id));

      expect(row.taken).toBe(true);
      expect(row.batch).toBe(batchId);
    });
  });

  it("writes nothing for an empty batch", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    await withFixture(async (fixture) => {
      const ids = await insertImportedTrades(fixture.tx, [], fixture.accountId);
      expect(ids).toEqual([]);
    });
  });
});

describe("updateImportedTrades", () => {
  it("fills in the exit and leaves the notes alone", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    await withFixture(async (fixture) => {
      const batchId = await newBatch(fixture);
      const [id] = await insertImportedTrades(
        fixture.tx,
        [
          importedTrade(fixture, batchId, {
            exitTime: null,
            exitPrice: null,
            points: null,
            result: null,
          }),
        ],
        fixture.accountId,
      );

      // The journalling work that has to survive.
      await fixture.tx
        .update(trades)
        .set({ notes: "held it through the news", grade: "B" })
        .where(eq(trades.id, id));

      const written = await updateImportedTrades(fixture.tx, fixture.userId, [
        {
          tradeId: id,
          values: {
            exitTime: "09:45",
            exitPrice: 20050,
            points: 50,
            result: "Win",
          },
        },
      ]);

      expect(written).toBe(1);

      const [row] = await fixture.tx
        .select({
          exitPrice: trades.exitPrice,
          exitTime: trades.exitTime,
          result: trades.result,
          notes: trades.notes,
          grade: trades.grade,
        })
        .from(trades)
        .where(eq(trades.id, id));

      expect(row.exitPrice).toBe("20050.0000");
      expect(row.exitTime).toBe("09:45:00");
      expect(row.result).toBe("Win");
      expect(row.notes).toBe("held it through the news");
      expect(row.grade).toBe("B");
    });
  });

  it("writes nothing for a trade that belongs to somebody else", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    await withFixture(async (fixture) => {
      const batchId = await newBatch(fixture);
      const [id] = await insertImportedTrades(
        fixture.tx,
        [importedTrade(fixture, batchId)],
        fixture.accountId,
      );

      const written = await updateImportedTrades(
        fixture.tx,
        fixture.userId + 9999,
        [{ tradeId: id, values: { contracts: 99 } }],
      );

      expect(written).toBe(0);

      const [row] = await fixture.tx
        .select({ contracts: trades.contracts })
        .from(trades)
        .where(eq(trades.id, id));

      expect(row.contracts).toBe("2.0000");
    });
  });

  it("writes every row of a batch that shares one set of fields", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    await withFixture(async (fixture) => {
      const batchId = await newBatch(fixture);
      const ids = await insertImportedTrades(
        fixture.tx,
        [20000, 20100, 20200].map((entryPrice) =>
          importedTrade(fixture, batchId, {
            entryPrice,
            exitTime: null,
            exitPrice: null,
            points: null,
            result: null,
          }),
        ),
        fixture.accountId,
      );

      const written = await updateImportedTrades(
        fixture.tx,
        fixture.userId,
        ids.map((id, index) => ({
          tradeId: id,
          values: {
            exitTime: "09:45",
            exitPrice: 20500 + index,
            points: 10 + index,
            result: "Win" as const,
          },
        })),
      );

      expect(written).toBe(3);

      const rows = await fixture.tx
        .select({ id: trades.id, exitPrice: trades.exitPrice })
        .from(trades)
        .where(inArray(trades.id, ids))
        .orderBy(asc(trades.id));

      // Each row keeps its own value: one statement, not one value for all.
      expect(rows.map((row) => row.exitPrice)).toEqual([
        "20500.0000",
        "20501.0000",
        "20502.0000",
      ]);
    });
  });

  it("keeps updates with different field sets apart", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    await withFixture(async (fixture) => {
      const batchId = await newBatch(fixture);
      const [closing, renaming] = await insertImportedTrades(
        fixture.tx,
        [
          importedTrade(fixture, batchId, {
            entryPrice: 20000,
            exitTime: null,
            exitPrice: null,
            points: null,
            result: null,
          }),
          importedTrade(fixture, batchId, { entryPrice: 20100 }),
        ],
        fixture.accountId,
      );

      // Two signatures: one closes a position, the other corrects the size.
      const written = await updateImportedTrades(fixture.tx, fixture.userId, [
        {
          tradeId: closing,
          values: { exitTime: "09:45", exitPrice: 20050, result: "Win" },
        },
        { tradeId: renaming, values: { contracts: 7 } },
      ]);

      expect(written).toBe(2);

      const rows = await fixture.tx
        .select({
          id: trades.id,
          contracts: trades.contracts,
          exitPrice: trades.exitPrice,
          result: trades.result,
        })
        .from(trades)
        .where(inArray(trades.id, [closing, renaming]))
        .orderBy(asc(trades.id));

      // The closing row keeps its contracts, the resized one keeps its exit:
      // a field outside an update's own set is never touched by it.
      expect(rows[0]).toMatchObject({
        contracts: "2.0000",
        exitPrice: "20050.0000",
        result: "Win",
      });
      // 20050 is the fixture's exit; the resize never named exitPrice, so it
      // still stands.
      expect(rows[1]).toMatchObject({
        contracts: "7.0000",
        exitPrice: "20050.0000",
      });
    });
  });

  it("does nothing when there is nothing to write", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    await withFixture(async (fixture) => {
      expect(await updateImportedTrades(fixture.tx, fixture.userId, [])).toBe(
        0,
      );
      // An outcome with an empty value set must not produce a statement at all.
      expect(
        await updateImportedTrades(fixture.tx, fixture.userId, [
          { tradeId: 1, values: {} },
        ]),
      ).toBe(0);
    });
  });
});

describe("listImportBatches", () => {
  it("counts what a batch holds and what an undo would remove", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    await withFixture(async (fixture) => {
      const batchId = await newBatch(fixture, "ninjatrader.csv");
      const ids = await insertImportedTrades(
        fixture.tx,
        [
          importedTrade(fixture, batchId),
          importedTrade(fixture, batchId, { entryPrice: 20100 }),
          importedTrade(fixture, batchId, { entryPrice: 20200 }),
        ],
        fixture.accountId,
      );

      await fixture.tx
        .update(trades)
        .set({ notes: "worked on this one" })
        .where(eq(trades.id, ids[0]));

      const [batch] = await listImportBatches(fixture.userId, fixture.tx);

      expect(batch).toMatchObject({
        id: batchId,
        filename: "ninjatrader.csv",
        detectedShape: "round-trip",
        accountName: "Import target",
        total: 3,
        removable: 2,
      });

      // Not covered by toMatchObject, and not by the type either: a raw
      // `execute` hands back whatever the driver parsed, and postgres-js
      // parses a timestamptz to a string. The batch list renders this.
      expect(batch.createdAt).toBeInstanceOf(Date);
      expect(Number.isNaN(batch.createdAt.getTime())).toBe(false);
    });
  });

  it("does not let an import-set session protect a trade", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    await withFixture(async (fixture) => {
      const batchId = await newBatch(fixture);
      await insertImportedTrades(
        fixture.tx,
        [importedTrade(fixture, batchId, { session: "NY-AM" })],
        fixture.accountId,
      );

      const [batch] = await listImportBatches(fixture.userId, fixture.tx);
      expect(batch.removable).toBe(1);
    });
  });

  it("counts a screenshot and a link as handiwork", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    await withFixture(async (fixture) => {
      const batchId = await newBatch(fixture);
      const ids = await insertImportedTrades(
        fixture.tx,
        [
          importedTrade(fixture, batchId),
          importedTrade(fixture, batchId, { entryPrice: 20100 }),
          importedTrade(fixture, batchId, { entryPrice: 20200 }),
        ],
        fixture.accountId,
      );

      await fixture.tx
        .insert(tradeScreenshots)
        .values({ tradeId: ids[0], storageKey: "k", sortOrder: 0 });
      await fixture.tx
        .insert(tradeLinks)
        .values({ tradeId: ids[1], url: "https://example.com", sortOrder: 0 });

      const [batch] = await listImportBatches(fixture.userId, fixture.tx);
      expect(batch.removable).toBe(1);
    });
  });
});

describe("removeUntouchedTrades", () => {
  it("removes the untouched ones and keeps the rest", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    await withFixture(async (fixture) => {
      const batchId = await newBatch(fixture);
      const ids = await insertImportedTrades(
        fixture.tx,
        [
          importedTrade(fixture, batchId),
          importedTrade(fixture, batchId, { entryPrice: 20100 }),
        ],
        fixture.accountId,
      );

      await fixture.tx
        .update(trades)
        .set({ setupType: "Reversal" })
        .where(eq(trades.id, ids[0]));

      const removed = await removeUntouchedTrades(
        fixture.tx,
        fixture.userId,
        batchId,
      );

      const left = await fixture.tx
        .select({ id: trades.id })
        .from(trades)
        .where(eq(trades.importBatchId, batchId));

      expect(removed).toBe(1);
      expect(left.map((row) => row.id)).toEqual([ids[0]]);
    });
  });

  it("takes the account assignment with the trade", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    await withFixture(async (fixture) => {
      const batchId = await newBatch(fixture);
      await insertImportedTrades(
        fixture.tx,
        [importedTrade(fixture, batchId)],
        fixture.accountId,
      );

      await removeUntouchedTrades(fixture.tx, fixture.userId, batchId);

      const [assignments] = await fixture.tx
        .select({ count: sql<number>`count(*)::int` })
        .from(tradeAccounts)
        .where(eq(tradeAccounts.accountId, fixture.accountId));

      expect(Number(assignments.count)).toBe(0);
    });
  });

  it("drops the batch row once nothing points at it", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    await withFixture(async (fixture) => {
      const batchId = await newBatch(fixture);
      await insertImportedTrades(
        fixture.tx,
        [importedTrade(fixture, batchId)],
        fixture.accountId,
      );

      await removeUntouchedTrades(fixture.tx, fixture.userId, batchId);

      const left = await fixture.tx
        .select({ id: importBatches.id })
        .from(importBatches)
        .where(eq(importBatches.id, batchId));

      expect(left).toEqual([]);
    });
  });

  it("keeps the batch row while a kept trade still points at it", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    await withFixture(async (fixture) => {
      const batchId = await newBatch(fixture);
      const [id] = await insertImportedTrades(
        fixture.tx,
        [importedTrade(fixture, batchId)],
        fixture.accountId,
      );
      await fixture.tx
        .update(trades)
        .set({ notes: "keep me" })
        .where(eq(trades.id, id));

      await removeUntouchedTrades(fixture.tx, fixture.userId, batchId);

      const left = await fixture.tx
        .select({ id: importBatches.id })
        .from(importBatches)
        .where(eq(importBatches.id, batchId));

      expect(left).toHaveLength(1);
    });
  });

  it("never touches a hand-logged trade", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    await withFixture(async (fixture) => {
      const batchId = await newBatch(fixture);
      await insertImportedTrades(
        fixture.tx,
        [importedTrade(fixture, batchId)],
        fixture.accountId,
      );

      // import_batch_id null = logged by hand.
      const [manual] = await fixture.tx
        .insert(trades)
        .values({
          userId: fixture.userId,
          tradeDate: "2026-08-20",
          instrumentId: fixture.instrumentId,
          taken: true,
          contracts: "1",
          entryTime: "10:00",
          direction: "long",
          entryPrice: "20000",
        })
        .returning({ id: trades.id });

      await removeUntouchedTrades(fixture.tx, fixture.userId, batchId);

      const [still] = await fixture.tx
        .select({ id: trades.id })
        .from(trades)
        .where(eq(trades.id, manual.id));

      expect(still.id).toBe(manual.id);
    });
  });

  it("removes nothing for a batch of another user", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    await withFixture(async (fixture) => {
      const batchId = await newBatch(fixture);
      await insertImportedTrades(
        fixture.tx,
        [importedTrade(fixture, batchId)],
        fixture.accountId,
      );

      const removed = await removeUntouchedTrades(
        fixture.tx,
        fixture.userId + 9999,
        batchId,
      );

      const left = await fixture.tx
        .select({ id: trades.id })
        .from(trades)
        .where(
          and(
            eq(trades.importBatchId, batchId),
            eq(trades.userId, fixture.userId),
          ),
        );

      expect(removed).toBe(0);
      expect(left).toHaveLength(1);
    });
  });
});

describe("insertImportedTrades — FTMO rows", () => {
  it("stores fractional lots, the file's P&L and its marks", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    let stored: Record<string, unknown> | undefined;
    await withFixture(async (fixture) => {
      const batchId = await createImportBatch(fixture.tx, {
        userId: fixture.userId,
        accountId: fixture.accountId,
        filename: "ftmo.csv",
        rowCount: 1,
        detectedShape: "ftmo",
      });
      const [id] = await insertImportedTrades(
        fixture.tx,
        [
          importedTrade(fixture, batchId, {
            contracts: 1.88,
            stopPrice: 19990,
            pnl: {
              sourceCents: 5676,
              usdCents: 6505,
              fxRateDate: "2026-08-19",
            },
          }),
        ],
        fixture.accountId,
      );
      [stored] = await fixture.tx
        .select({
          contracts: trades.contracts,
          stopPrice: trades.stopPrice,
          stopImported: trades.stopImported,
          pnlOverride: trades.pnlOverride,
          pnlSource: trades.pnlSource,
          fxRateDate: trades.fxRateDate,
        })
        .from(trades)
        .where(eq(trades.id, id));
    });

    expect(stored).toEqual({
      contracts: "1.8800",
      stopPrice: "19990.0000",
      stopImported: true,
      pnlOverride: "65.05",
      pnlSource: "56.76",
      fxRateDate: "2026-08-19",
    });
  });

  it("lets an undo remove a trade whose stop and P&L came from the file", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    let removed = -1;
    await withFixture(async (fixture) => {
      const batchId = await createImportBatch(fixture.tx, {
        userId: fixture.userId,
        accountId: fixture.accountId,
        filename: "ftmo.csv",
        rowCount: 1,
        detectedShape: "ftmo",
      });
      await insertImportedTrades(
        fixture.tx,
        [
          importedTrade(fixture, batchId, {
            stopPrice: 19990,
            pnl: { sourceCents: 5676, usdCents: 5676, fxRateDate: null },
          }),
        ],
        fixture.accountId,
      );
      removed = await removeUntouchedTrades(
        fixture.tx,
        fixture.userId,
        batchId,
      );
    });

    expect(removed).toBe(1);
  });

  it("keeps a trade whose stop or P&L the user set by hand", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    let removed = -1;
    await withFixture(async (fixture) => {
      const batchId = await createImportBatch(fixture.tx, {
        userId: fixture.userId,
        accountId: fixture.accountId,
        filename: "ftmo.csv",
        rowCount: 2,
        detectedShape: "ftmo",
      });
      const [stopByHand, pnlByHand] = await insertImportedTrades(
        fixture.tx,
        [
          importedTrade(fixture, batchId, { stopPrice: 19990 }),
          importedTrade(fixture, batchId, {
            entryTime: "10:30",
            pnl: { sourceCents: 5676, usdCents: 5676, fxRateDate: null },
          }),
        ],
        fixture.accountId,
      );
      // What the edit action writes after importMarksAfterEdit.
      await fixture.tx
        .update(trades)
        .set({ stopImported: false })
        .where(eq(trades.id, stopByHand));
      await fixture.tx
        .update(trades)
        .set({ pnlOverride: "60.00", pnlSource: null, fxRateDate: null })
        .where(eq(trades.id, pnlByHand));

      removed = await removeUntouchedTrades(
        fixture.tx,
        fixture.userId,
        batchId,
      );
    });

    expect(removed).toBe(0);
  });
});

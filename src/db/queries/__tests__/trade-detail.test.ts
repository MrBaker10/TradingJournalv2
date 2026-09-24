import { eq, sql, TransactionRollbackError } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../index.ts";
import { accounts } from "../../schema/accounts.ts";
import { instruments } from "../../schema/instruments.ts";
import {
  confluenceTags,
  mistakeTags,
  tradeAccounts,
  tradeConfluences,
  tradeLinks,
  tradeMistakes,
  tradeScreenshots,
  trades,
} from "../../schema/trades.ts";
import { users } from "../../schema/users.ts";
import {
  getJournalTradeById,
  type JournalTradeRow,
  listJournalTrades,
  replaceTradeWithRelations,
  type TradeWriteColumns,
} from "../trades.ts";

// The detail page and the edit form are the first readers of a single trade,
// and the first writers that *replace* rather than append. Both behaviours are
// only true if Postgres says so, so they are pinned here rather than against a
// stand-in: correlated jsonb subqueries, an OR'd visibility predicate and
// ON DELETE CASCADE have no JavaScript equivalent to check against.
//
// Every case runs inside a transaction that is always rolled back, like the
// other query tests — nothing survives in the local dev database.

const TEST_INSTRUMENT_SYMBOL = "TEST-TRADE-DETAIL";

let dbReachable = false;

beforeAll(async () => {
  try {
    await db.execute(sql`select 1`);
    dbReachable = true;
  } catch {
    dbReachable = false;
  }
});

interface Fixture {
  userId: number;
  otherUserId: number;
  instrumentId: number;
  realAccountId: number;
  practiceAccountId: number;
  confluenceTagIds: number[];
  mistakeTagIds: number[];
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function seedFixture(tx: Tx): Promise<Fixture> {
  const [user] = await tx
    .insert(users)
    .values({
      username: "trade-detail-fixture",
      email: "trade-detail-fixture@users.invalid",
      displayName: "Trade Detail Fixture",
      timezone: "UTC",
    })
    .returning({ id: users.id });

  const [otherUser] = await tx
    .insert(users)
    .values({
      username: "trade-detail-stranger",
      email: "trade-detail-stranger@users.invalid",
      displayName: "Stranger",
      timezone: "UTC",
    })
    .returning({ id: users.id });

  const [instrument] = await tx
    .insert(instruments)
    .values({
      symbol: TEST_INSTRUMENT_SYMBOL,
      name: "Throwaway test instrument",
      pointValue: "2",
      tickSize: "0.25",
    })
    .returning({ id: instruments.id });

  const [realAccount] = await tx
    .insert(accounts)
    .values({ userId: user.id, name: "Eval", sortOrder: 0 })
    .returning({ id: accounts.id });

  const [practiceAccount] = await tx
    .insert(accounts)
    .values({
      userId: user.id,
      name: "Backtest",
      sortOrder: 1,
      isPractice: true,
    })
    .returning({ id: accounts.id });

  // The tag vocabularies are seeded reference data, so the fixture borrows
  // real rows instead of inventing its own.
  const confluenceRows = await tx
    .select({ id: confluenceTags.id })
    .from(confluenceTags)
    .limit(2);
  const mistakeRows = await tx
    .select({ id: mistakeTags.id })
    .from(mistakeTags)
    .limit(2);

  return {
    userId: user.id,
    otherUserId: otherUser.id,
    instrumentId: instrument.id,
    realAccountId: realAccount.id,
    practiceAccountId: practiceAccount.id,
    confluenceTagIds: confluenceRows.map((row) => row.id),
    mistakeTagIds: mistakeRows.map((row) => row.id),
  };
}

function takenTradeColumns(fixture: Fixture): TradeWriteColumns {
  return {
    tradeDate: "2026-03-02",
    instrumentId: fixture.instrumentId,
    taken: true,
    contracts: 2,
    entryTime: "09:31:00",
    exitTime: "10:02:00",
    direction: "long",
    entryPrice: "100.0000",
    exitPrice: "110.0000",
    stopPrice: "95.0000",
    points: "10.0000",
    result: "Win",
    grade: "B",
    notes: "fixture",
  };
}

/**
 * Runs `body` against a fixture inside a transaction and always rolls back.
 *
 * The queries under test take that transaction as their executor, so they see
 * the fixture rows without anything being committed.
 */
async function withFixture<T>(
  body: (tx: Tx, fixture: Fixture) => Promise<T>,
): Promise<T> {
  let result: T | undefined;

  try {
    await db.transaction(async (tx) => {
      const fixture = await seedFixture(tx);
      result = await body(tx, fixture);
      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }

  return result as T;
}

describe("getJournalTradeById", () => {
  it("returns the confluences and mistakes the row carries", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const trade = await withFixture(async (tx, fixture) => {
      const [row] = await tx
        .insert(trades)
        .values({ userId: fixture.userId, ...takenTradeColumns(fixture) })
        .returning({ id: trades.id });

      await tx
        .insert(tradeAccounts)
        .values({ tradeId: row.id, accountId: fixture.realAccountId });
      await tx.insert(tradeConfluences).values(
        fixture.confluenceTagIds.map((confluenceTagId) => ({
          tradeId: row.id,
          confluenceTagId,
        })),
      );
      await tx.insert(tradeMistakes).values(
        fixture.mistakeTagIds.map((mistakeTagId) => ({
          tradeId: row.id,
          mistakeTagId,
        })),
      );

      return getJournalTradeById(fixture.userId, row.id, tx);
    });

    expect(trade).not.toBeNull();
    expect((trade as JournalTradeRow).confluences).toHaveLength(2);
    expect((trade as JournalTradeRow).mistakes).toHaveLength(2);
    // The group comes along, because the detail page renders the badges
    // grouped the way the form offers them.
    for (const confluence of (trade as JournalTradeRow).confluences) {
      expect(typeof confluence.group).toBe("string");
      expect(confluence.label.length).toBeGreaterThan(0);
    }
  });

  it("returns empty arrays, not null, for a trade without tags", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const trade = await withFixture(async (tx, fixture) => {
      const [row] = await tx
        .insert(trades)
        .values({ userId: fixture.userId, ...takenTradeColumns(fixture) })
        .returning({ id: trades.id });
      await tx
        .insert(tradeAccounts)
        .values({ tradeId: row.id, accountId: fixture.realAccountId });

      return getJournalTradeById(fixture.userId, row.id, tx);
    });

    expect((trade as JournalTradeRow).confluences).toEqual([]);
    expect((trade as JournalTradeRow).mistakes).toEqual([]);
  });

  it("carries instrumentId and pnlOverride for the edit form", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const trade = await withFixture(async (tx, fixture) => {
      const [row] = await tx
        .insert(trades)
        .values({
          userId: fixture.userId,
          ...takenTradeColumns(fixture),
          pnlOverride: "42.50",
        })
        .returning({ id: trades.id });
      await tx
        .insert(tradeAccounts)
        .values({ tradeId: row.id, accountId: fixture.realAccountId });

      return getJournalTradeById(fixture.userId, row.id, tx);
    });

    expect((trade as JournalTradeRow).instrumentId).toBeGreaterThan(0);
    // Without this the override would vanish the moment the trade is edited,
    // and the derived P&L would quietly take over.
    expect((trade as JournalTradeRow).pnlOverride).toBe(42.5);
  });

  // The trap this slice had to avoid: the list hides a practice-only trade
  // behind a counter, but its own page must still open. Both halves are
  // checked together so neither can be "fixed" alone.
  it("opens a practice-only trade the combined list hides", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const { detail, listed } = await withFixture(async (tx, fixture) => {
      const [row] = await tx
        .insert(trades)
        .values({ userId: fixture.userId, ...takenTradeColumns(fixture) })
        .returning({ id: trades.id });
      await tx
        .insert(tradeAccounts)
        .values({ tradeId: row.id, accountId: fixture.practiceAccountId });

      const result = await listJournalTrades(
        {
          userId: fixture.userId,
          selectedAccountId: null,
          sortBy: "date",
          sortDir: "desc",
          page: 1,
        },
        tx,
      );

      return {
        detail: await getJournalTradeById(fixture.userId, row.id, tx),
        listed: result.rows.some((listedRow) => listedRow.id === row.id),
      };
    });

    expect(detail).not.toBeNull();
    expect(listed).toBe(false);
  });

  it("returns null for another user's trade", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const trade = await withFixture(async (tx, fixture) => {
      const [row] = await tx
        .insert(trades)
        .values({ userId: fixture.userId, ...takenTradeColumns(fixture) })
        .returning({ id: trades.id });

      return getJournalTradeById(fixture.otherUserId, row.id, tx);
    });

    expect(trade).toBeNull();
  });

  it("returns null for an id that does not exist", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const trade = await withFixture((tx, fixture) =>
      getJournalTradeById(fixture.userId, 2_147_483_600, tx),
    );

    expect(trade).toBeNull();
  });
});

describe("replaceTradeWithRelations", () => {
  it("replaces accounts and tags instead of adding to them", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const trade = await withFixture(async (tx, fixture) => {
      const [row] = await tx
        .insert(trades)
        .values({ userId: fixture.userId, ...takenTradeColumns(fixture) })
        .returning({ id: trades.id });

      await tx
        .insert(tradeAccounts)
        .values({ tradeId: row.id, accountId: fixture.realAccountId });
      await tx.insert(tradeConfluences).values(
        fixture.confluenceTagIds.map((confluenceTagId) => ({
          tradeId: row.id,
          confluenceTagId,
        })),
      );
      await tx.insert(tradeMistakes).values({
        tradeId: row.id,
        mistakeTagId: fixture.mistakeTagIds[0],
      });

      await replaceTradeWithRelations(tx, row.id, takenTradeColumns(fixture), {
        accountIds: [fixture.practiceAccountId],
        confluenceTagIds: [fixture.confluenceTagIds[0]],
        mistakeTagIds: [],
      });

      return getJournalTradeById(fixture.userId, row.id, tx);
    });

    const row = trade as JournalTradeRow;
    expect(row.accounts.map((account) => account.name)).toEqual(["Backtest"]);
    expect(row.confluences).toHaveLength(1);
    // An unticked mistake has to be gone, not merely not-added.
    expect(row.mistakes).toEqual([]);
  });

  it("clears the exit columns when a trade becomes a missed setup", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const trade = await withFixture(async (tx, fixture) => {
      const [row] = await tx
        .insert(trades)
        .values({
          userId: fixture.userId,
          ...takenTradeColumns(fixture),
          pnlOverride: "123.00",
          byTheBook: true,
        })
        .returning({ id: trades.id });
      await tx
        .insert(tradeAccounts)
        .values({ tradeId: row.id, accountId: fixture.realAccountId });

      await replaceTradeWithRelations(
        tx,
        row.id,
        {
          tradeDate: "2026-03-02",
          instrumentId: fixture.instrumentId,
          taken: false,
          contracts: null,
          entryTime: "09:31:00",
          exitTime: null,
          direction: "long",
          entryPrice: "100.0000",
          exitPrice: null,
          stopPrice: "95.0000",
          points: null,
          pnlOverride: null,
          result: null,
          byTheBook: null,
          notes: "now missed",
        },
        { accountIds: [], confluenceTagIds: [], mistakeTagIds: [] },
      );

      return getJournalTradeById(fixture.userId, row.id, tx);
    });

    const row = trade as JournalTradeRow;
    expect(row.taken).toBe(false);
    expect(row.exitPrice).toBeNull();
    expect(row.exitTime).toBeNull();
    expect(row.contracts).toBeNull();
    expect(row.result).toBeNull();
    expect(row.byTheBook).toBeNull();
    // No exit means no realised figure, whatever the override used to say.
    expect(row.pnlOverride).toBeNull();
    expect(row.pnlCents).toBeNull();
    expect(row.accounts).toEqual([]);
  });

  it("moves updated_at forward", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const { before, after } = await withFixture(async (tx, fixture) => {
      const [row] = await tx
        .insert(trades)
        .values({
          userId: fixture.userId,
          ...takenTradeColumns(fixture),
          updatedAt: new Date("2020-01-01T00:00:00Z"),
        })
        .returning({ id: trades.id, updatedAt: trades.updatedAt });

      await replaceTradeWithRelations(tx, row.id, takenTradeColumns(fixture), {
        accountIds: [fixture.realAccountId],
        confluenceTagIds: [],
        mistakeTagIds: [],
      });

      const [updated] = await tx
        .select({ updatedAt: trades.updatedAt })
        .from(trades)
        .where(eq(trades.id, row.id));

      return { before: row.updatedAt, after: updated.updatedAt };
    });

    // The column has a DEFAULT but no ON UPDATE trigger, so this only passes
    // while replaceTradeWithRelations sets it by hand.
    expect(after.getTime()).toBeGreaterThan(before.getTime());
  });
});

describe("deleting a trade", () => {
  it("takes its assignments, tags, links and screenshots with it", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const remaining = await withFixture(async (tx, fixture) => {
      const [row] = await tx
        .insert(trades)
        .values({ userId: fixture.userId, ...takenTradeColumns(fixture) })
        .returning({ id: trades.id });

      await tx
        .insert(tradeAccounts)
        .values({ tradeId: row.id, accountId: fixture.realAccountId });
      await tx.insert(tradeConfluences).values({
        tradeId: row.id,
        confluenceTagId: fixture.confluenceTagIds[0],
      });
      await tx.insert(tradeMistakes).values({
        tradeId: row.id,
        mistakeTagId: fixture.mistakeTagIds[0],
      });
      await tx.insert(tradeLinks).values({
        tradeId: row.id,
        url: "https://example.com/chart",
        sortOrder: 0,
      });
      await tx.insert(tradeScreenshots).values({
        tradeId: row.id,
        storageKey: "fixture/one.jpg",
        sortOrder: 0,
      });

      // Exactly what deleteTrade runs: one statement, the cascade does the
      // rest. Nothing in the action clears these tables by hand, so if a
      // cascade were ever dropped from a migration this is what would catch
      // it.
      await tx.delete(trades).where(eq(trades.id, row.id));

      const count = async (
        table:
          | typeof tradeAccounts
          | typeof tradeConfluences
          | typeof tradeMistakes
          | typeof tradeLinks
          | typeof tradeScreenshots,
      ) => {
        const rows = await tx
          .select({ id: table.id })
          .from(table)
          .where(eq(table.tradeId, row.id));
        return rows.length;
      };

      return {
        accounts: await count(tradeAccounts),
        confluences: await count(tradeConfluences),
        mistakes: await count(tradeMistakes),
        links: await count(tradeLinks),
        screenshots: await count(tradeScreenshots),
      };
    });

    expect(remaining).toEqual({
      accounts: 0,
      confluences: 0,
      mistakes: 0,
      links: 0,
      screenshots: 0,
    });
  });
});

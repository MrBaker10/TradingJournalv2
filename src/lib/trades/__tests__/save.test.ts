import { and, asc, eq, sql, TransactionRollbackError } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../../db/index.ts";
import {
  accountCommissionRates,
  accounts,
} from "../../../db/schema/accounts.ts";
import { fxRates } from "../../../db/schema/fx-rates.ts";
import { instruments } from "../../../db/schema/instruments.ts";
import {
  confluenceTags,
  mistakeTags,
  tradeAccounts,
  tradeConfluences,
  tradeLinks,
  tradeMistakes,
  trades,
} from "../../../db/schema/trades.ts";
import { users } from "../../../db/schema/users.ts";
import type { FxRate, RateCurrency } from "../../../domain/fx.ts";
import type { CreateTradeInput } from "../../../schemas/trades.ts";
import { saveTrade } from "../save.ts";

// The rules that protect a trader's data on save — an account id from the
// browser is never trusted, a missed setup carries no account, a typed
// commission wins over the account's rate — only hold if Postgres says so,
// so they are pinned at the save module's interface against the real
// database. Every case runs inside a transaction that is always rolled back,
// with a fake rate fetcher instead of the ECB.

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

interface Fixture {
  userId: number;
  otherUserId: number;
  instrumentId: number;
  accountId: number;
  otherUsersAccountId: number;
}

async function seedFixture(tx: Tx): Promise<Fixture> {
  const [user] = await tx
    .insert(users)
    .values({
      username: "save-trade-fixture",
      email: "save-trade-fixture@users.invalid",
      displayName: "Save Trade Fixture",
      timezone: "UTC",
    })
    .returning({ id: users.id });
  const [otherUser] = await tx
    .insert(users)
    .values({
      username: "save-trade-stranger",
      email: "save-trade-stranger@users.invalid",
      displayName: "Stranger",
      timezone: "UTC",
    })
    .returning({ id: users.id });
  const [instrument] = await tx
    .insert(instruments)
    .values({
      symbol: "TEST-SAVE-TRADE",
      name: "Throwaway test instrument",
      pointValue: "2",
      tickSize: "0.25",
    })
    .returning({ id: instruments.id });
  const [account] = await tx
    .insert(accounts)
    .values({ userId: user.id, name: "Eval", sortOrder: 0 })
    .returning({ id: accounts.id });
  const [otherUsersAccount] = await tx
    .insert(accounts)
    .values({ userId: otherUser.id, name: "Not yours", sortOrder: 0 })
    .returning({ id: accounts.id });

  return {
    userId: user.id,
    otherUserId: otherUser.id,
    instrumentId: instrument.id,
    accountId: account.id,
    otherUsersAccountId: otherUsersAccount.id,
  };
}

// Long 2 contracts from 100 to 110 with the stop at 95, point value 2:
// $40 and 2R.
function takenDraft(
  fixture: Fixture,
  overrides: Partial<Extract<CreateTradeInput, { taken: true }>> = {},
): CreateTradeInput {
  return {
    taken: true,
    tradeDate: "2026-03-02",
    instrumentId: fixture.instrumentId,
    direction: "long",
    entryTime: "09:31",
    exitTime: "10:02",
    entryPrice: 100,
    exitPrice: 110,
    stopPrice: 95,
    contracts: 2,
    accountIds: [fixture.accountId],
    commissions: [],
    confluenceTagIds: [],
    mistakeTagIds: [],
    links: [],
    ...overrides,
  };
}

// No id in these tables reaches this high.
const UNKNOWN_ID = 2_147_483_647;

function failingFetcher() {
  return async (_currency: RateCurrency, _from: string, _to: string) => {
    throw new Error("The ECB is not part of this test");
  };
}

function fixedFetcher(rates: FxRate[]) {
  return async (_currency: RateCurrency, from: string, to: string) =>
    rates.filter((rate) => rate.date >= from && rate.date <= to);
}

async function addAccount(
  tx: Tx,
  userId: number,
  values: { name: string; archivedAt?: Date },
): Promise<number> {
  const [account] = await tx
    .insert(accounts)
    .values({ userId, sortOrder: 1, ...values })
    .returning({ id: accounts.id });
  return account.id;
}

async function tradeCount(tx: Tx, userId: number): Promise<number> {
  const rows = await tx
    .select({ id: trades.id })
    .from(trades)
    .where(eq(trades.userId, userId));
  return rows.length;
}

async function assignmentsOf(tx: Tx, tradeId: number) {
  return tx
    .select({
      accountId: tradeAccounts.accountId,
      commission: tradeAccounts.commission,
      commissionSource: tradeAccounts.commissionSource,
    })
    .from(tradeAccounts)
    .where(eq(tradeAccounts.tradeId, tradeId))
    .orderBy(tradeAccounts.accountId);
}

describe("saveTrade — create", () => {
  it("saves a taken trade on the user's account and returns its figures", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const fixture = await seedFixture(tx);
      const saved = await saveTrade(fixture.userId, takenDraft(fixture), {
        executor: tx,
        fetcher: failingFetcher(),
      });
      if (!saved.success) return { saved, fixture };
      const [row] = await tx
        .select({ userId: trades.userId, pnlOverride: trades.pnlOverride })
        .from(trades)
        .where(eq(trades.id, saved.data.id));
      return {
        saved,
        fixture,
        row,
        assignments: await assignmentsOf(tx, saved.data.id),
      };
    });

    expect(result.saved).toMatchObject({
      success: true,
      data: { pnlCents: 4000, rMultiple: 2 },
    });
    expect(result.row).toEqual({
      userId: result.fixture.userId,
      pnlOverride: null,
    });
    expect(result.assignments).toEqual([
      {
        accountId: result.fixture.accountId,
        commission: null,
        commissionSource: null,
      },
    ]);
  });

  it("drops another user's account ids", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const fixture = await seedFixture(tx);
      const draft = takenDraft(fixture, {
        accountIds: [fixture.accountId, fixture.otherUsersAccountId],
      });
      const saved = await saveTrade(fixture.userId, draft, {
        executor: tx,
        fetcher: failingFetcher(),
      });
      if (!saved.success) return { saved, fixture };
      return {
        saved,
        fixture,
        assignments: await assignmentsOf(tx, saved.data.id),
      };
    });

    expect(result.saved.success).toBe(true);
    expect(result.assignments?.map((row) => row.accountId)).toEqual([
      result.fixture.accountId,
    ]);
  });

  it("fails a taken trade left without accounts and writes nothing", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const fixture = await seedFixture(tx);
      const draft = takenDraft(fixture, {
        accountIds: [fixture.otherUsersAccountId],
      });
      const saved = await saveTrade(fixture.userId, draft, {
        executor: tx,
        fetcher: failingFetcher(),
      });
      return { saved, count: await tradeCount(tx, fixture.userId) };
    });

    expect(result.saved).toEqual({
      success: false,
      error: "A taken trade needs at least one account.",
    });
    expect(result.count).toBe(0);
  });

  it("rejects an archived account", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const fixture = await seedFixture(tx);
      const archivedId = await addAccount(tx, fixture.userId, {
        name: "Retired",
        archivedAt: new Date("2026-02-01T00:00:00Z"),
      });
      return saveTrade(
        fixture.userId,
        takenDraft(fixture, { accountIds: [archivedId] }),
        { executor: tx, fetcher: failingFetcher() },
      );
    });

    expect(result).toEqual({
      success: false,
      error: "A taken trade needs at least one account.",
    });
  });

  it("saves a missed setup without accounts", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const fixture = await seedFixture(tx);
      const saved = await saveTrade(
        fixture.userId,
        {
          taken: false,
          tradeDate: "2026-03-02",
          instrumentId: fixture.instrumentId,
          direction: "short",
          entryTime: "14:05",
          entryPrice: 120,
          confluenceTagIds: [],
          mistakeTagIds: [],
          links: [],
        },
        { executor: tx, fetcher: failingFetcher() },
      );
      if (!saved.success) return { saved };
      const [row] = await tx
        .select({ taken: trades.taken, contracts: trades.contracts })
        .from(trades)
        .where(eq(trades.id, saved.data.id));
      return {
        saved,
        row,
        assignments: await assignmentsOf(tx, saved.data.id),
      };
    });

    expect(result.saved).toMatchObject({
      success: true,
      data: { pnlCents: null, rMultiple: null },
    });
    expect(result.row).toEqual({ taken: false, contracts: null });
    expect(result.assignments).toEqual([]);
  });

  it("fails an unknown instrument with today's message", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const fixture = await seedFixture(tx);
      return saveTrade(
        fixture.userId,
        takenDraft(fixture, { instrumentId: UNKNOWN_ID }),
        { executor: tx, fetcher: failingFetcher() },
      );
    });

    expect(result).toEqual({ success: false, error: "Instrument not found" });
  });

  it("fails an unknown confluence or mistake tag with today's messages", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const fixture = await seedFixture(tx);
      const options = { executor: tx, fetcher: failingFetcher() };
      return {
        confluence: await saveTrade(
          fixture.userId,
          takenDraft(fixture, { confluenceTagIds: [UNKNOWN_ID] }),
          options,
        ),
        mistake: await saveTrade(
          fixture.userId,
          takenDraft(fixture, { mistakeTagIds: [UNKNOWN_ID] }),
          options,
        ),
      };
    });

    expect(result.confluence).toEqual({
      success: false,
      error: "One or more confluence tags not found",
    });
    expect(result.mistake).toEqual({
      success: false,
      error: "One or more mistake tags not found",
    });
  });

  it("stores the tags it was sent", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const fixture = await seedFixture(tx);
      // The tag vocabularies are seeded reference data, so the test borrows
      // real rows instead of inventing its own.
      const [confluence] = await tx
        .select({ id: confluenceTags.id })
        .from(confluenceTags)
        .limit(1);
      const [mistake] = await tx
        .select({ id: mistakeTags.id })
        .from(mistakeTags)
        .limit(1);
      const saved = await saveTrade(
        fixture.userId,
        takenDraft(fixture, {
          confluenceTagIds: [confluence.id],
          mistakeTagIds: [mistake.id],
        }),
        { executor: tx, fetcher: failingFetcher() },
      );
      if (!saved.success) return { saved };
      return {
        saved,
        expected: { confluence: [confluence.id], mistake: [mistake.id] },
        confluence: (
          await tx
            .select({ id: tradeConfluences.confluenceTagId })
            .from(tradeConfluences)
            .where(eq(tradeConfluences.tradeId, saved.data.id))
        ).map((row) => row.id),
        mistake: (
          await tx
            .select({ id: tradeMistakes.mistakeTagId })
            .from(tradeMistakes)
            .where(eq(tradeMistakes.tradeId, saved.data.id))
        ).map((row) => row.id),
      };
    });

    expect(result.saved.success).toBe(true);
    expect(result.confluence).toEqual(result.expected?.confluence);
    expect(result.mistake).toEqual(result.expected?.mistake);
  });

  it("takes each account's commission from its rate unless an amount was typed", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const fixture = await seedFixture(tx);
      const copyId = await addAccount(tx, fixture.userId, { name: "Copy" });
      const notOnTradeId = await addAccount(tx, fixture.userId, {
        name: "Idle",
      });
      // $1.50 per contract and side on both accounts.
      await tx.insert(accountCommissionRates).values([
        {
          accountId: fixture.accountId,
          instrumentId: fixture.instrumentId,
          perSide: "1.50",
        },
        {
          accountId: copyId,
          instrumentId: fixture.instrumentId,
          perSide: "1.50",
        },
      ]);
      const saved = await saveTrade(
        fixture.userId,
        takenDraft(fixture, {
          accountIds: [fixture.accountId, copyId],
          commissions: [
            { accountId: copyId, amount: 4.25 },
            { accountId: notOnTradeId, amount: 9 },
          ],
        }),
        { executor: tx, fetcher: failingFetcher() },
      );
      if (!saved.success) return { saved };
      return {
        saved,
        accountId: fixture.accountId,
        copyId,
        assignments: await assignmentsOf(tx, saved.data.id),
      };
    });

    expect(result.saved.success).toBe(true);
    // 2 contracts × 2 sides × $1.50 = $6.00; the typed $4.25 wins on the copy;
    // the $9 for an account the trade is not on goes nowhere.
    expect(result.assignments).toEqual([
      {
        accountId: result.accountId,
        commission: "6.00",
        commissionSource: "rate",
      },
      {
        accountId: result.copyId,
        commission: "4.25",
        commissionSource: "manual",
      },
    ]);
  });

  it("stores the links sent with a new trade", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const links = await inRollback(async (tx) => {
      const fixture = await seedFixture(tx);
      const saved = await saveTrade(
        fixture.userId,
        takenDraft(fixture, {
          links: [
            { url: "https://www.tradingview.com/x/abc123/", label: "Chart" },
            { url: "https://example.com/notes" },
          ],
        }),
        { executor: tx, fetcher: failingFetcher() },
      );
      if (!saved.success) return [];
      return tx
        .select({ url: tradeLinks.url, label: tradeLinks.label })
        .from(tradeLinks)
        .where(eq(tradeLinks.tradeId, saved.data.id))
        .orderBy(asc(tradeLinks.sortOrder));
    });

    expect(links).toEqual([
      { url: "https://www.tradingview.com/x/abc123/", label: "Chart" },
      { url: "https://example.com/notes", label: null },
    ]);
  });

  // The rate dates sit in 2001 so no rate a developer fetched locally can
  // land in the window.
  async function euroDraft(tx: Tx, fixture: Fixture) {
    const [euroInstrument] = await tx
      .insert(instruments)
      .values({
        symbol: "TEST-SAVE-TRADE-EUR",
        name: "Throwaway euro instrument",
        pointValue: "2",
        tickSize: "0.25",
        profitCurrency: "EUR",
      })
      .returning({ id: instruments.id });
    return takenDraft(fixture, {
      instrumentId: euroInstrument.id,
      tradeDate: "2001-03-09",
    });
  }

  it("converts a foreign profit currency with the fetched rate", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const fixture = await seedFixture(tx);
      return saveTrade(fixture.userId, await euroDraft(tx, fixture), {
        executor: tx,
        fetcher: fixedFetcher([{ date: "2001-03-09", rateVsUsd: "1.5" }]),
      });
    });

    // 40 EUR at 1.5 USD per EUR.
    expect(result).toMatchObject({
      success: true,
      data: { pnlCents: 6000, rMultiple: 2 },
    });
  });

  it("stores the trade date's rate for an account kept in another currency", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const stored = await inRollback(async (tx) => {
      const fixture = await seedFixture(tx);
      const [euroAccount] = await tx
        .insert(accounts)
        .values({
          userId: fixture.userId,
          name: "Euro account",
          sortOrder: 1,
          currency: "EUR",
        })
        .returning({ id: accounts.id });
      await saveTrade(
        fixture.userId,
        takenDraft(fixture, {
          tradeDate: "2001-03-09",
          accountIds: [euroAccount.id],
        }),
        {
          executor: tx,
          fetcher: fixedFetcher([{ date: "2001-03-09", rateVsUsd: "1.25" }]),
        },
      );
      return tx
        .select({ rateVsUsd: fxRates.rateVsUsd })
        .from(fxRates)
        .where(
          and(eq(fxRates.currency, "EUR"), eq(fxRates.rateDate, "2001-03-09")),
        );
    });

    expect(stored).toEqual([{ rateVsUsd: "1.2500000000" }]);
  });

  it("still saves the trade when the rate cannot be fetched", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const fixture = await seedFixture(tx);
      const saved = await saveTrade(
        fixture.userId,
        await euroDraft(tx, fixture),
        { executor: tx, fetcher: failingFetcher() },
      );
      return { saved, count: await tradeCount(tx, fixture.userId) };
    });

    // Which rate the P&L then takes depends on what the table holds — the
    // nearest stored one, or none — so only the save itself is asserted.
    expect(result.saved.success).toBe(true);
    expect(result.count).toBe(1);
  });
});

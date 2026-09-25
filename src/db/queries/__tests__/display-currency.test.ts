import { eq, sql, TransactionRollbackError } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import {
  type AccountCurrency,
  displayCurrencyFor,
  toAccountCents,
} from "../../../domain/fx.ts";
import { db } from "../../index.ts";
import { accounts } from "../../schema/accounts.ts";
import { fxRates } from "../../schema/fx-rates.ts";
import { importBatches } from "../../schema/import-batches.ts";
import { instruments } from "../../schema/instruments.ts";
import { tradeAccounts, trades } from "../../schema/trades.ts";
import { users } from "../../schema/users.ts";
import { getDayTotals, getStartingBalanceCents } from "../dashboard.ts";
import { listForeignCurrencies } from "../fx.ts";
import { listScopeCurrencies } from "../scope.ts";
import { tradeDisplayCents } from "../trades.ts";

// display-currency (decided 2026-09-24/25): figures in the accounts' own
// currency. Rates sit in 2001 and the fixtures on a user of their own, so no
// rate or trade a developer has locally changes an answer. Every case runs in
// a rolled-back transaction.

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
  eur: number;
  usd: number;
  instrumentId: number;
  batchIntoEur: number;
}

async function fixture(tx: Tx): Promise<Fixture> {
  const [user] = await tx
    .insert(users)
    .values({
      username: "display-currency",
      email: "display-currency@users.invalid",
      displayName: "Display Currency",
      timezone: "Europe/Berlin",
    })
    .returning({ id: users.id });
  const [eur] = await tx
    .insert(accounts)
    .values({
      userId: user.id,
      name: "FTMO",
      sortOrder: 0,
      currency: "EUR",
      startingBalance: "100000.00",
      startingBalanceUsd: "92000.00",
      startingBalanceRateDate: "2001-03-12",
    })
    .returning({ id: accounts.id });
  const [usd] = await tx
    .insert(accounts)
    .values({
      userId: user.id,
      name: "Lucid",
      sortOrder: 1,
      startingBalance: "50000.00",
      startingBalanceUsd: "50000.00",
    })
    .returning({ id: accounts.id });
  const [instrument] = await tx
    .insert(instruments)
    .values({
      symbol: "TEST-DISPLAY-CCY",
      name: "Throwaway test instrument",
      pointValue: "1",
      tickSize: "0.01",
    })
    .returning({ id: instruments.id });
  const [batch] = await tx
    .insert(importBatches)
    .values({
      userId: user.id,
      accountId: eur.id,
      filename: "ftmo.csv",
      rowCount: 1,
      detectedShape: "ftmo",
    })
    .returning({ id: importBatches.id });
  await tx.insert(fxRates).values([
    { currency: "EUR", rateDate: "2001-03-09", rateVsUsd: "0.931200" },
    { currency: "EUR", rateDate: "2001-03-12", rateVsUsd: "0.920000" },
  ]);
  return {
    userId: user.id,
    eur: eur.id,
    usd: usd.id,
    instrumentId: instrument.id,
    batchIntoEur: batch.id,
  };
}

async function trade(
  tx: Tx,
  f: Fixture,
  values: {
    date: string;
    pnlOverride: string;
    pnlSource?: string;
    imported?: boolean;
    accountIds: number[];
  },
): Promise<number> {
  const [row] = await tx
    .insert(trades)
    .values({
      userId: f.userId,
      tradeDate: values.date,
      instrumentId: f.instrumentId,
      taken: true,
      contracts: "1",
      entryTime: "10:00:00",
      exitTime: "10:05:00",
      direction: "long",
      entryPrice: "100.0000",
      exitPrice: "101.0000",
      pnlOverride: values.pnlOverride,
      pnlSource: values.pnlSource ?? null,
      importBatchId: values.imported ? f.batchIntoEur : null,
    })
    .returning({ id: trades.id });
  await tx
    .insert(tradeAccounts)
    .values(
      values.accountIds.map((accountId) => ({ tradeId: row.id, accountId })),
    );
  return row.id;
}

async function displayCents(
  tx: Tx,
  tradeId: number,
  currency: AccountCurrency,
): Promise<number | null> {
  const [row] = await tx
    .select({ cents: tradeDisplayCents(currency) })
    .from(trades)
    .innerJoin(instruments, eq(trades.instrumentId, instruments.id))
    .where(eq(trades.id, tradeId));
  return row.cents === null ? null : Number(row.cents);
}

describe("tradeDisplayCents (SQL) vs toAccountCents (fx.ts)", () => {
  it.for([
    ["a gain", "65.05"],
    ["a loss", "-32.79"],
    ["half a cent up", "0.46"],
    ["half a cent down", "-0.46"],
    ["a large amount", "123456.78"],
  ] as const)("agrees on %s", async ([, usd], ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const f = await fixture(tx);
      const id = await trade(tx, f, {
        date: "2001-03-12",
        pnlOverride: usd,
        accountIds: [f.eur],
      });
      return displayCents(tx, id, "EUR");
    });

    const usdCents = Math.round(Number(usd) * 100);
    expect(result).toBe(toAccountCents(usdCents, "0.920000"));
  });
});

describe("tradeDisplayCents — which amount and which rate", () => {
  it("is exactly tradePnlCents in USD", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const f = await fixture(tx);
      const id = await trade(tx, f, {
        date: "2001-03-12",
        pnlOverride: "65.05",
        accountIds: [f.usd],
      });
      return displayCents(tx, id, "USD");
    });

    expect(result).toBe(6505);
  });

  it("shows the file's own amount for a trade imported into the EUR account", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const f = await fixture(tx);
      const id = await trade(tx, f, {
        date: "2001-03-12",
        pnlOverride: "61.69",
        pnlSource: "56.76",
        imported: true,
        accountIds: [f.eur],
      });
      return displayCents(tx, id, "EUR");
    });

    expect(result).toBe(5676);
  });

  it("takes the last rate on or before the trade date, across a weekend", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const f = await fixture(tx);
      // Saturday 2001-03-10: Friday's 0.9312.
      const id = await trade(tx, f, {
        date: "2001-03-10",
        pnlOverride: "93.12",
        accountIds: [f.eur],
      });
      return displayCents(tx, id, "EUR");
    });

    expect(result).toBe(toAccountCents(9312, "0.931200"));
  });

  it("falls back to the earliest rate for a trade older than every stored one", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const f = await fixture(tx);
      const id = await trade(tx, f, {
        date: "2000-01-03",
        pnlOverride: "93.12",
        accountIds: [f.eur],
      });
      return displayCents(tx, id, "EUR");
    });

    expect(result).toBe(toAccountCents(9312, "0.931200"));
  });
});

describe("the display currency of a scope", () => {
  it("is the selected account's own", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const f = await fixture(tx);
      return displayCurrencyFor(
        await listScopeCurrencies(
          { userId: f.userId, selectedAccountId: f.eur },
          tx,
        ),
      );
    });

    expect(result).toBe("EUR");
  });

  it("is USD for real accounts in both currencies", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const f = await fixture(tx);
      return displayCurrencyFor(
        await listScopeCurrencies(
          { userId: f.userId, selectedAccountId: null },
          tx,
        ),
      );
    });

    expect(result).toBe("USD");
  });

  it("is EUR when every real account is, a USD practice account aside", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const f = await fixture(tx);
      await tx
        .update(accounts)
        .set({ isPractice: true })
        .where(eq(accounts.id, f.usd));
      return displayCurrencyFor(
        await listScopeCurrencies(
          { userId: f.userId, selectedAccountId: null },
          tx,
        ),
      );
    });

    expect(result).toBe("EUR");
  });
});

describe("money figures in EUR", () => {
  it("sums a day per trade in EUR, the file amount and the converted one", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const f = await fixture(tx);
      await trade(tx, f, {
        date: "2001-03-12",
        pnlOverride: "61.69",
        pnlSource: "56.76",
        imported: true,
        accountIds: [f.eur],
      });
      await trade(tx, f, {
        date: "2001-03-12",
        pnlOverride: "-9.20",
        accountIds: [f.eur],
      });
      const scope = {
        userId: f.userId,
        selectedAccountId: f.eur,
        currency: "EUR" as const,
      };
      return {
        days: (await getDayTotals(scope, undefined, tx)).days,
        balance: await getStartingBalanceCents(scope, tx),
      };
    });

    // 5676 + (-920 / 0.92 = -1000) = 4676 cents
    expect(result.days).toEqual([
      expect.objectContaining({ date: "2001-03-12", amountCents: 4676 }),
    ]);
    expect(result.balance).toBe(10_000_000);
  });

  it("converts a copy-traded trade from its USD amount for the EUR account", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const f = await fixture(tx);
      // Logged by hand, on both accounts: no file amount in EUR to show.
      const id = await trade(tx, f, {
        date: "2001-03-12",
        pnlOverride: "92.00",
        accountIds: [f.eur, f.usd],
      });
      return {
        eur: await displayCents(tx, id, "EUR"),
        usd: await displayCents(tx, id, "USD"),
      };
    });

    expect(result).toEqual({ eur: 10_000, usd: 9_200 });
  });
});

describe("listForeignCurrencies", () => {
  it("names the foreign currencies among the user's own accounts only", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const f = await fixture(tx);
      const [stranger] = await tx
        .insert(users)
        .values({
          username: "display-currency-other",
          email: "display-currency-other@users.invalid",
          displayName: "Other",
          timezone: "UTC",
        })
        .returning({ id: users.id });
      return {
        own: await listForeignCurrencies(f.userId, [f.eur, f.usd], tx),
        usdOnly: await listForeignCurrencies(f.userId, [f.usd], tx),
        foreign: await listForeignCurrencies(stranger.id, [f.eur], tx),
        none: await listForeignCurrencies(f.userId, [], tx),
      };
    });

    expect(result).toEqual({
      own: ["EUR"],
      usdOnly: [],
      foreign: [],
      none: [],
    });
  });
});

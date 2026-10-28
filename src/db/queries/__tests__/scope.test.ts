import { eq, sql, TransactionRollbackError } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../../index.ts";
import { accounts } from "../../schema/accounts.ts";
import { fxRates } from "../../schema/fx-rates.ts";
import { instruments } from "../../schema/instruments.ts";
import { tradeAccounts, trades } from "../../schema/trades.ts";
import { users } from "../../schema/users.ts";
import {
  moneyContribution,
  moneyWeight,
  type QueryScope,
  rowMoney,
  scopeWhere,
} from "../scope.ts";

// The scope module's interface against real Postgres: which trades an account
// scope sees and which cents each one adds. One fixture covers every kind of
// trade the rules tell apart; the rates sit in 2001 and the fixture on a user
// of its own, so nothing a developer has locally changes an answer. Every case
// runs in a rolled-back transaction.

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

const TRADE_DATE = "2001-03-12";

type AccountName = "Live" | "Eval" | "Demo";
type TradeName = "copy" | "practiceOnly" | "shared" | "missed" | "foreign";

interface Fixture {
  userId: number;
  accountIds: Record<AccountName, number>;
  tradeNames: Map<number, TradeName>;
}

interface FixtureTrade {
  name: TradeName;
  /** Exit price; entry is always 100, so this minus 100 is the P&L in points. */
  exit?: string;
  foreign?: boolean;
  /** Commission in USD dollars per assigned account. */
  on: Partial<Record<AccountName, string>>;
}

// Two real accounts with a copy trade, a practice account with a trade of its
// own and a copy trade it shares with a real account, a missed setup, and a
// trade whose instrument settles in GBP. Point value 1, one contract.
const FIXTURE_TRADES: FixtureTrade[] = [
  { name: "copy", exit: "110", on: { Live: "2.00", Eval: "3.00" } },
  { name: "practiceOnly", exit: "105", on: { Demo: "1.00" } },
  { name: "shared", exit: "90", on: { Demo: "4.00", Live: "1.50" } },
  { name: "missed", on: {} },
  { name: "foreign", exit: "120", foreign: true, on: { Eval: "0.50" } },
];

async function fixture(tx: Tx): Promise<Fixture> {
  const [user] = await tx
    .insert(users)
    .values({
      username: "scope-fixture",
      email: "scope-fixture@users.invalid",
      displayName: "Scope Fixture",
      timezone: "UTC",
    })
    .returning({ id: users.id });

  const accountIds = {} as Record<AccountName, number>;
  const kinds: [AccountName, boolean][] = [
    ["Live", false],
    ["Eval", false],
    ["Demo", true],
  ];
  for (const [index, [name, isPractice]] of kinds.entries()) {
    const [account] = await tx
      .insert(accounts)
      .values({ userId: user.id, name, sortOrder: index, isPractice })
      .returning({ id: accounts.id });
    accountIds[name] = account.id;
  }

  const [usdInstrument] = await tx
    .insert(instruments)
    .values({
      symbol: "TEST-SCOPE-USD",
      name: "Throwaway test instrument",
      pointValue: "1",
      tickSize: "0.01",
    })
    .returning({ id: instruments.id });
  const [gbpInstrument] = await tx
    .insert(instruments)
    .values({
      symbol: "TEST-SCOPE-GBP",
      name: "Throwaway test instrument",
      pointValue: "1",
      tickSize: "0.01",
      profitCurrency: "GBP",
    })
    .returning({ id: instruments.id });
  await tx
    .insert(fxRates)
    .values({ currency: "GBP", rateDate: TRADE_DATE, rateVsUsd: "1.250000" })
    .onConflictDoUpdate({
      target: [fxRates.currency, fxRates.rateDate],
      set: { rateVsUsd: "1.250000" },
    });

  const tradeNames = new Map<number, TradeName>();
  for (const fixtureTrade of FIXTURE_TRADES) {
    const taken = fixtureTrade.exit !== undefined;
    const [trade] = await tx
      .insert(trades)
      .values({
        userId: user.id,
        tradeDate: TRADE_DATE,
        instrumentId: fixtureTrade.foreign
          ? gbpInstrument.id
          : usdInstrument.id,
        taken,
        contracts: taken ? "1" : null,
        entryTime: "10:00",
        exitTime: taken ? "10:05" : null,
        direction: "long",
        entryPrice: "100",
        exitPrice: fixtureTrade.exit ?? null,
      })
      .returning({ id: trades.id });
    tradeNames.set(trade.id, fixtureTrade.name);

    for (const [name, commission] of Object.entries(fixtureTrade.on)) {
      await tx.insert(tradeAccounts).values({
        tradeId: trade.id,
        accountId: accountIds[name as AccountName],
        commission,
        commissionSource: "file",
      });
    }
  }

  return { userId: user.id, accountIds, tradeNames };
}

interface FigureRow {
  money: number | null;
  weight: number;
  row: number | null;
}

function scopeFor(f: Fixture, selected: AccountName | null): QueryScope {
  return {
    userId: f.userId,
    selectedAccountId: selected === null ? null : f.accountIds[selected],
  };
}

function cents(value: unknown): number | null {
  return value === null ? null : Number(value);
}

/**
 * Figure money, its weight and row money for every trade the scope sees, by
 * trade name.
 */
async function figures(
  selected: AccountName | null,
): Promise<Partial<Record<TradeName, FigureRow>>> {
  return inRollback(async (tx) => {
    const f = await fixture(tx);
    const scope = scopeFor(f, selected);
    const rows = await tx
      .select({
        id: trades.id,
        money: moneyContribution(scope),
        weight: moneyWeight(scope),
        row: rowMoney(scope),
      })
      .from(trades)
      .innerJoin(instruments, eq(trades.instrumentId, instruments.id))
      .where(scopeWhere(scope));

    const byName: Partial<Record<TradeName, FigureRow>> = {};
    for (const row of rows) {
      const name = f.tradeNames.get(row.id);
      if (name === undefined) throw new Error(`Unknown trade ${row.id}`);
      byName[name] = {
        money: cents(row.money),
        weight: Number(row.weight),
        row: cents(row.row),
      };
    }
    return byName;
  });
}

/** Row money of one trade by name, read by its id outside any scope filter. */
async function rowMoneyOf(
  selected: AccountName | null,
  name: TradeName,
): Promise<number | null> {
  return inRollback(async (tx) => {
    const f = await fixture(tx);
    const id = [...f.tradeNames].find(([, n]) => n === name)?.[0];
    if (id === undefined) throw new Error(`No fixture trade "${name}"`);
    const [row] = await tx
      .select({ row: rowMoney(scopeFor(f, selected)) })
      .from(trades)
      .innerJoin(instruments, eq(trades.instrumentId, instruments.id))
      .where(eq(trades.id, id));
    return cents(row.row);
  });
}

function sum(values: (number | null)[]): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

describe("figure money, its weight and row money per account scope", () => {
  it("counts a copy trade once per real account, net of the real accounts' commission, with all accounts", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    expect(await figures(null)).toEqual({
      // +$10 on Live and Eval: 2 × 1000 − (200 + 300).
      copy: { money: 1500, weight: 2, row: 1500 },
      // −$10, one real account: −1000 − Live's 150; Demo's 400 is not paid by a real account.
      shared: { money: -1150, weight: 1, row: -1150 },
      // 20 GBP at 1.25 = $25.00, less Eval's 50.
      foreign: { money: 2450, weight: 1, row: 2450 },
      // In scope, but no P&L and no real account to weigh.
      missed: { money: null, weight: 0, row: null },
      // practiceOnly is not in a combined figure at all.
    });
  });

  it("takes one real account's gross minus its own commission, never multiplied", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    expect(await figures("Live")).toEqual({
      copy: { money: 800, weight: 1, row: 800 },
      shared: { money: -1150, weight: 1, row: -1150 },
      missed: { money: null, weight: 1, row: null },
    });
  });

  it("reads the practice account's own trades when it is selected", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    expect(await figures("Demo")).toEqual({
      practiceOnly: { money: 400, weight: 1, row: 400 },
      shared: { money: -1400, weight: 1, row: -1400 },
      missed: { money: null, weight: 1, row: null },
    });
  });
});

describe("row money against figure money", () => {
  it.for([
    ["all accounts", null],
    ["one real account", "Live"],
    ["the practice account", "Demo"],
  ] as const)(
    "adds up to the figure over the rows %s sees",
    async ([, selected], ctx) => {
      ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

      const rows = Object.values(await figures(selected));
      expect(sum(rows.map((row) => row.row))).toBe(
        sum(rows.map((row) => row.money)),
      );
    },
  );

  it("gives a practice-only trade the sum over its own accounts, outside every combined figure", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    // Reached by its own link with all accounts: +$5 on Demo, less Demo's 100.
    expect(await rowMoneyOf(null, "practiceOnly")).toBe(400);
    expect(await figures(null)).not.toHaveProperty("practiceOnly");
    expect(await figures("Live")).not.toHaveProperty("practiceOnly");
  });
});

import { sql, TransactionRollbackError } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import type { IsoDate } from "../../../domain/streak.ts";
import { db } from "../../index.ts";
import { accountRules } from "../../schema/account-rules.ts";
import { accounts } from "../../schema/accounts.ts";
import { instruments } from "../../schema/instruments.ts";
import { propFirmPrograms, propFirms } from "../../schema/prop-firms.ts";
import { tradeAccounts, trades } from "../../schema/trades.ts";
import { users } from "../../schema/users.ts";
import { getAttemptDays } from "../account-rules.ts";

// The attempt's day series for the rule status (prop-firm-link, ticket 02).
// Every case runs in a rolled-back transaction on users of its own.

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
  tx: Tx;
  instrumentId: number;
  programId: number;
}

async function fixture(tx: Tx): Promise<Fixture> {
  const [instrument] = await tx
    .insert(instruments)
    .values({
      symbol: "TEST-ATTEMPT-DAYS",
      name: "Attempt days test",
      pointValue: "2",
      tickSize: "0.25",
    })
    .returning({ id: instruments.id });
  const [firm] = await tx
    .insert(propFirms)
    .values({ name: "Attempt days test firm" })
    .returning({ id: propFirms.id });
  const [program] = await tx
    .insert(propFirmPrograms)
    .values({ firmId: firm.id, name: "50k Static" })
    .returning({ id: propFirmPrograms.id });
  return { tx, instrumentId: instrument.id, programId: program.id };
}

async function newUser(f: Fixture, name: string) {
  const [user] = await f.tx
    .insert(users)
    .values({
      username: name,
      email: `${name}@users.invalid`,
      displayName: name,
      timezone: "Europe/Berlin",
    })
    .returning({ id: users.id });
  return user.id;
}

/** A real $50,000 account linked from `evaluationStart`. */
async function linkedAccount(
  f: Fixture,
  userId: number,
  name: string,
  evaluationStart: IsoDate,
) {
  const [account] = await f.tx
    .insert(accounts)
    .values({
      userId,
      name,
      sortOrder: 0,
      startingBalance: "50000.00",
      startingBalanceUsd: "50000.00",
    })
    .returning({ id: accounts.id });
  await f.tx.insert(accountRules).values({
    accountId: account.id,
    programId: f.programId,
    evaluationStart,
    profitTarget: "3000.00",
    drawdownAmount: "2000.00",
    drawdownType: "static",
  });
  return account.id;
}

/**
 * One long trade of one contract at point value 2: `points` × $2 gross. Each
 * account of `on` pays `commission` USD. No accounts = a missed setup.
 */
async function trade(
  f: Fixture,
  userId: number,
  values: {
    date: IsoDate;
    points: number;
    on: number[];
    commission?: string;
  },
) {
  const taken = values.on.length > 0;
  const [row] = await f.tx
    .insert(trades)
    .values({
      userId,
      tradeDate: values.date,
      instrumentId: f.instrumentId,
      taken,
      contracts: "1",
      entryTime: "09:30",
      direction: "long",
      entryPrice: "100",
      exitPrice: taken ? String(100 + values.points) : null,
    })
    .returning({ id: trades.id });
  for (const accountId of values.on) {
    await f.tx.insert(tradeAccounts).values({
      tradeId: row.id,
      accountId,
      commission: values.commission ?? null,
      commissionSource: values.commission ? "manual" : null,
    });
  }
}

describe("getAttemptDays", () => {
  it("excludes trades before the evaluation start", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const days = await inRollback(async (tx) => {
      const f = await fixture(tx);
      const userId = await newUser(f, "attempt-start");
      const eval1 = await linkedAccount(f, userId, "Eval", "2026-10-13");
      await trade(f, userId, { date: "2026-10-12", points: 50, on: [eval1] });
      await trade(f, userId, { date: "2026-10-13", points: 10, on: [eval1] });
      await trade(f, userId, { date: "2026-10-14", points: -5, on: [eval1] });
      return getAttemptDays(userId, eval1, tx);
    });

    expect(days).toEqual([
      { tradingDay: "2026-10-13", netCents: 2_000 },
      { tradingDay: "2026-10-14", netCents: -1_000 },
    ]);
  });

  it("lands a Sunday and a Saturday trade on the following Monday", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const days = await inRollback(async (tx) => {
      const f = await fixture(tx);
      const userId = await newUser(f, "attempt-sunday");
      const eval1 = await linkedAccount(f, userId, "Eval", "2026-10-01");
      await trade(f, userId, { date: "2026-10-16", points: 1, on: [eval1] }); // Fri
      await trade(f, userId, { date: "2026-10-17", points: 2, on: [eval1] }); // Sat
      await trade(f, userId, { date: "2026-10-18", points: 3, on: [eval1] }); // Sun
      await trade(f, userId, { date: "2026-10-19", points: 4, on: [eval1] }); // Mon
      return getAttemptDays(userId, eval1, tx);
    });

    expect(days).toEqual([
      { tradingDay: "2026-10-16", netCents: 200 },
      { tradingDay: "2026-10-19", netCents: 1_800 },
    ]);
  });

  it("counts a copy trade once per linked account, unmultiplied, net of that account's commission", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const f = await fixture(tx);
      const userId = await newUser(f, "attempt-copy");
      const a = await linkedAccount(f, userId, "Eval A", "2026-10-01");
      const b = await linkedAccount(f, userId, "Eval B", "2026-10-01");
      await trade(f, userId, {
        date: "2026-10-14",
        points: 50, // $100 gross per account
        on: [a, b],
        commission: "4.50",
      });
      return {
        a: await getAttemptDays(userId, a, tx),
        b: await getAttemptDays(userId, b, tx),
      };
    });

    expect(result.a).toEqual([{ tradingDay: "2026-10-14", netCents: 9_550 }]);
    expect(result.b).toEqual([{ tradingDay: "2026-10-14", netCents: 9_550 }]);
  });

  it("leaves out missed setups, which are not a trading day", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const days = await inRollback(async (tx) => {
      const f = await fixture(tx);
      const userId = await newUser(f, "attempt-missed");
      const eval1 = await linkedAccount(f, userId, "Eval", "2026-10-01");
      await trade(f, userId, { date: "2026-10-14", points: 10, on: [eval1] });
      await trade(f, userId, { date: "2026-10-15", points: 0, on: [] });
      return getAttemptDays(userId, eval1, tx);
    });

    expect(days).toEqual([{ tradingDay: "2026-10-14", netCents: 2_000 }]);
  });

  it("never reads another user's account or trades", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const f = await fixture(tx);
      const owner = await newUser(f, "attempt-owner");
      const other = await newUser(f, "attempt-other");
      const ownerEval = await linkedAccount(f, owner, "Eval", "2026-10-01");
      await trade(f, owner, {
        date: "2026-10-14",
        points: 10,
        on: [ownerEval],
      });
      // A trade of the other user on the owner's account id: the user filter
      // has to drop it even though the assignment matches.
      await trade(f, other, {
        date: "2026-10-15",
        points: 99,
        on: [ownerEval],
      });
      return {
        asOther: await getAttemptDays(other, ownerEval, tx),
        asOwner: await getAttemptDays(owner, ownerEval, tx),
      };
    });

    expect(result.asOther).toEqual([]);
    expect(result.asOwner).toEqual([
      { tradingDay: "2026-10-14", netCents: 2_000 },
    ]);
  });
});

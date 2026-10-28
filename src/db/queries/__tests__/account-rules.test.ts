import { eq, sql, TransactionRollbackError } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import type { IsoDate } from "../../../domain/streak.ts";
import { db } from "../../index.ts";
import { accountRules } from "../../schema/account-rules.ts";
import { accounts } from "../../schema/accounts.ts";
import { instruments } from "../../schema/instruments.ts";
import { ledgerEntries } from "../../schema/ledger.ts";
import { propFirmPrograms, propFirms } from "../../schema/prop-firms.ts";
import { tradeAccounts, trades } from "../../schema/trades.ts";
import { users } from "../../schema/users.ts";
import {
  getAccountRules,
  getAttempt,
  listProgramLinks,
} from "../account-rules.ts";

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

// The user's calendar date for every case: after all fixture dates.
const TODAY = "2026-10-19";

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

/** A ledger entry: a reset expense or a payout, `amount` in USD. */
async function ledger(
  f: Fixture,
  userId: number,
  values: {
    date: IsoDate;
    kind: "reset" | "payout" | "evaluation";
    amount: string;
    accountId: number | null;
  },
) {
  await f.tx.insert(ledgerEntries).values({
    userId,
    accountId: values.accountId,
    entryDate: values.date,
    kind: values.kind === "payout" ? "payout" : "expense",
    category: values.kind === "payout" ? null : values.kind,
    amount: values.amount,
  });
}

describe("getAttempt — day series", () => {
  it("excludes trades before the evaluation start", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const days = await inRollback(async (tx) => {
      const f = await fixture(tx);
      const userId = await newUser(f, "attempt-start");
      const eval1 = await linkedAccount(f, userId, "Eval", "2026-10-13");
      await trade(f, userId, { date: "2026-10-12", points: 50, on: [eval1] });
      await trade(f, userId, { date: "2026-10-13", points: 10, on: [eval1] });
      await trade(f, userId, { date: "2026-10-14", points: -5, on: [eval1] });
      return (await getAttempt(userId, eval1, TODAY, tx))?.days;
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
      return (await getAttempt(userId, eval1, TODAY, tx))?.days;
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
        a: (await getAttempt(userId, a, TODAY, tx))?.days,
        b: (await getAttempt(userId, b, TODAY, tx))?.days,
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
      return (await getAttempt(userId, eval1, TODAY, tx))?.days;
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
        asOther: await getAttempt(other, ownerEval, TODAY, tx),
        asOwner: (await getAttempt(owner, ownerEval, TODAY, tx))?.days,
      };
    });

    expect(result.asOther).toBeNull();
    expect(result.asOwner).toEqual([
      { tradingDay: "2026-10-14", netCents: 2_000 },
    ]);
  });
});

describe("getAttempt — resets and payouts", () => {
  it("starts the attempt at the latest reset; trades before it no longer count", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const attempt = await inRollback(async (tx) => {
      const f = await fixture(tx);
      const userId = await newUser(f, "attempt-reset");
      const eval1 = await linkedAccount(f, userId, "Eval", "2026-10-01");
      await trade(f, userId, { date: "2026-10-06", points: 10, on: [eval1] });
      await ledger(f, userId, {
        date: "2026-10-07",
        kind: "reset",
        amount: "80.00",
        accountId: eval1,
      });
      await trade(f, userId, { date: "2026-10-08", points: 20, on: [eval1] });
      await ledger(f, userId, {
        date: "2026-10-12",
        kind: "reset",
        amount: "80.00",
        accountId: eval1,
      });
      await trade(f, userId, { date: "2026-10-12", points: 3, on: [eval1] });
      await trade(f, userId, { date: "2026-10-13", points: 4, on: [eval1] });
      return getAttempt(userId, eval1, TODAY, tx);
    });

    expect(attempt).toEqual({
      start: "2026-10-12",
      days: [
        { tradingDay: "2026-10-12", netCents: 600 },
        { tradingDay: "2026-10-13", netCents: 800 },
      ],
      payouts: [],
    });
  });

  it("moves the boundary with a $0 reset and keeps the evaluation start when it is later", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const f = await fixture(tx);
      const userId = await newUser(f, "attempt-free-reset");
      const free = await linkedAccount(f, userId, "Free reset", "2026-10-01");
      const late = await linkedAccount(f, userId, "Late start", "2026-10-14");
      await ledger(f, userId, {
        date: "2026-10-09",
        kind: "reset",
        amount: "0.00",
        accountId: free,
      });
      await ledger(f, userId, {
        date: "2026-10-09",
        kind: "reset",
        amount: "80.00",
        accountId: late,
      });
      return {
        free: (await getAttempt(userId, free, TODAY, tx))?.start,
        late: (await getAttempt(userId, late, TODAY, tx))?.start,
      };
    });

    expect(result).toEqual({ free: "2026-10-09", late: "2026-10-14" });
  });

  it("returns the attempt's payouts on the account by trading day", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const attempt = await inRollback(async (tx) => {
      const f = await fixture(tx);
      const userId = await newUser(f, "attempt-payouts");
      const funded = await linkedAccount(f, userId, "Funded", "2026-10-01");
      await ledger(f, userId, {
        date: "2026-09-30",
        kind: "payout",
        amount: "999.00",
        accountId: funded,
      });
      await ledger(f, userId, {
        date: "2026-10-09",
        kind: "payout",
        amount: "500.00",
        accountId: funded,
      });
      await ledger(f, userId, {
        date: "2026-10-10",
        kind: "payout",
        amount: "250.00",
        accountId: funded,
      }); // Sat
      await ledger(f, userId, {
        date: "2026-10-12",
        kind: "payout",
        amount: "100.50",
        accountId: funded,
      });
      await ledger(f, userId, {
        date: "2026-10-12",
        kind: "evaluation",
        amount: "150.00",
        accountId: funded,
      });
      return getAttempt(userId, funded, TODAY, tx);
    });

    expect(attempt?.payouts).toEqual([
      { tradingDay: "2026-10-09", amountCents: 50_000 },
      { tradingDay: "2026-10-12", amountCents: 35_050 },
    ]);
    expect(attempt?.days).toEqual([]);
  });

  it("ignores ledger entries of other accounts and other users", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const attempt = await inRollback(async (tx) => {
      const f = await fixture(tx);
      const owner = await newUser(f, "attempt-ledger-owner");
      const other = await newUser(f, "attempt-ledger-other");
      const eval1 = await linkedAccount(f, owner, "Eval", "2026-10-01");
      const sibling = await linkedAccount(f, owner, "Sibling", "2026-10-01");
      await trade(f, owner, { date: "2026-10-06", points: 10, on: [eval1] });
      await ledger(f, owner, {
        date: "2026-10-08",
        kind: "reset",
        amount: "80.00",
        accountId: sibling,
      });
      await ledger(f, owner, {
        date: "2026-10-08",
        kind: "reset",
        amount: "80.00",
        accountId: null,
      });
      await ledger(f, owner, {
        date: "2026-10-09",
        kind: "payout",
        amount: "500.00",
        accountId: sibling,
      });
      // Another user's rows pointing at the owner's account id.
      await ledger(f, other, {
        date: "2026-10-08",
        kind: "reset",
        amount: "80.00",
        accountId: eval1,
      });
      await ledger(f, other, {
        date: "2026-10-09",
        kind: "payout",
        amount: "500.00",
        accountId: eval1,
      });
      return getAttempt(owner, eval1, TODAY, tx);
    });

    expect(attempt).toEqual({
      start: "2026-10-01",
      days: [{ tradingDay: "2026-10-06", netCents: 2_000 }],
      payouts: [],
    });
  });

  it("lets a reset dated after today wait for its day", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const f = await fixture(tx);
      const userId = await newUser(f, "attempt-future-reset");
      const eval1 = await linkedAccount(f, userId, "Eval", "2026-10-01");
      await ledger(f, userId, {
        date: "2026-10-12",
        kind: "reset",
        amount: "80.00",
        accountId: eval1,
      });
      await ledger(f, userId, {
        date: "2026-10-26",
        kind: "reset",
        amount: "80.00",
        accountId: eval1,
      });
      return {
        before: (await getAttempt(userId, eval1, "2026-10-19", tx))?.start,
        onTheDay: (await getAttempt(userId, eval1, "2026-10-26", tx))?.start,
      };
    });

    expect(result).toEqual({ before: "2026-10-12", onTheDay: "2026-10-26" });
  });
});

describe("getAccountRules", () => {
  it("returns an active account's link with its starting balance, only to its owner", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const f = await fixture(tx);
      const owner = await newUser(f, "rules-owner");
      const other = await newUser(f, "rules-other");
      const eval1 = await linkedAccount(f, owner, "Eval", "2026-10-01");
      const [unlinked] = await tx
        .insert(accounts)
        .values({
          userId: owner,
          name: "Unlinked",
          sortOrder: 1,
          startingBalance: "25000.00",
          startingBalanceUsd: "25000.00",
        })
        .returning({ id: accounts.id });
      const archived = await linkedAccount(f, owner, "Old eval", "2026-09-01");
      await tx
        .update(accounts)
        .set({ archivedAt: new Date("2026-10-15T00:00:00Z") })
        .where(eq(accounts.id, archived));
      return {
        own: await getAccountRules(owner, eval1, tx),
        archived: await getAccountRules(owner, archived, tx),
        unlinked: await getAccountRules(owner, unlinked.id, tx),
        foreign: await getAccountRules(other, eval1, tx),
      };
    });

    expect(result.own).toMatchObject({
      accountId: expect.any(Number),
      programName: "50k Static",
      evaluationStart: "2026-10-01",
      profitTargetCents: 300_000,
      drawdownAmountCents: 200_000,
      drawdownType: "static",
      startingBalanceUsdCents: 5_000_000,
    });
    expect(result.unlinked).toBeNull();
    expect(result.foreign).toBeNull();
    // Archiving keeps `users.selected_account_id`, while the switcher already
    // reads "All accounts": the card must not show for it.
    expect(result.archived).toBeNull();
  });
});

describe("listProgramLinks", () => {
  it("lists the owner's real, active accounts with their program's size, in account order", async (ctx) => {
    ctx.skip(!dbReachable, "Postgres not reachable — start DBngin first");

    const result = await inRollback(async (tx) => {
      const f = await fixture(tx);
      await tx
        .update(propFirmPrograms)
        .set({ accountSizeUsd: "50000.00" })
        .where(eq(propFirmPrograms.id, f.programId));
      const owner = await newUser(f, "links-owner");
      const other = await newUser(f, "links-other");
      const second = await linkedAccount(f, owner, "Eval B", "2026-10-01");
      await tx
        .update(accounts)
        .set({ sortOrder: 2 })
        .where(eq(accounts.id, second));
      await linkedAccount(f, owner, "Eval A", "2026-10-01");
      const practice = await linkedAccount(f, owner, "Sim", "2026-10-01");
      await tx
        .update(accounts)
        .set({ isPractice: true, sortOrder: 1 })
        .where(eq(accounts.id, practice));
      const archived = await linkedAccount(f, owner, "Old", "2026-09-01");
      await tx
        .update(accounts)
        .set({ archivedAt: new Date("2026-10-15T00:00:00Z") })
        .where(eq(accounts.id, archived));
      await linkedAccount(f, other, "Foreign", "2026-10-01");
      return {
        programId: f.programId,
        owner: await listProgramLinks(owner, tx),
      };
    });

    expect(result.owner).toEqual([
      {
        programId: result.programId,
        accountName: "Eval A",
        accountSizeUsd: 50_000,
      },
      {
        programId: result.programId,
        accountName: "Eval B",
        accountSizeUsd: 50_000,
      },
    ]);
  });
});

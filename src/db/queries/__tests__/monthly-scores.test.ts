import { and, eq, TransactionRollbackError } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { runMonthCloseJob } from "../../../lib/month-close/job.ts";
import { db } from "../../index.ts";
import { accounts } from "../../schema/accounts.ts";
import { instruments } from "../../schema/instruments.ts";
import { monthlyScores } from "../../schema/monthly-scores.ts";
import { tradeAccounts, trades } from "../../schema/trades.ts";
import { users } from "../../schema/users.ts";
import { getBestMonthlyScore, listMonthlyScores } from "../monthly-scores.ts";

// Month close (P2.6) against real Postgres. The job walks every user, so each
// case runs in a rolled-back transaction and asserts only on its own fixture
// users — whatever a developer has locally is written and thrown away too.
//
// September 2026 has 22 trading days, so one logged day is 40/22 = 1.8182
// for showing up and two are 3.6364.

const INSTRUMENT_SYMBOL = "TEST-MONTH-CLOSE";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function inRollback<T>(body: (tx: Tx) => Promise<T>): Promise<T> {
  let result: T | undefined;
  let finished = false;
  try {
    await db.transaction(async (tx) => {
      result = await body(tx);
      finished = true;
      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }
  if (!finished) throw new Error("Fixture never produced a result");
  return result as T;
}

interface Fixture {
  userId: number;
  realAccountId: number;
  practiceAccountId: number;
  instrumentId: number;
}

async function createFixture(
  tx: Tx,
  name: string,
  options: { timezone?: string; createdAt?: Date } = {},
): Promise<Fixture> {
  const [user] = await tx
    .insert(users)
    .values({
      username: name,
      email: `${name}@users.invalid`,
      displayName: name,
      timezone: options.timezone ?? "UTC",
      createdAt: options.createdAt ?? new Date("2026-01-01T12:00:00Z"),
    })
    .returning({ id: users.id });

  const [instrument] = await tx
    .insert(instruments)
    .values({
      symbol: `${INSTRUMENT_SYMBOL}-${name}`,
      name: "Throwaway test instrument",
      pointValue: "50",
      tickSize: "0.25",
    })
    .returning({ id: instruments.id });

  const [real] = await tx
    .insert(accounts)
    .values({ userId: user.id, name: "Live", sortOrder: 0 })
    .returning({ id: accounts.id });
  const [practice] = await tx
    .insert(accounts)
    .values({
      userId: user.id,
      name: "Practice",
      sortOrder: 1,
      isPractice: true,
    })
    .returning({ id: accounts.id });

  return {
    userId: user.id,
    realAccountId: real.id,
    practiceAccountId: practice.id,
    instrumentId: instrument.id,
  };
}

async function addTrade(
  tx: Tx,
  fixture: Fixture,
  tradeDate: string,
  accountId: number,
): Promise<void> {
  const [trade] = await tx
    .insert(trades)
    .values({
      userId: fixture.userId,
      tradeDate,
      instrumentId: fixture.instrumentId,
      taken: true,
      byTheBook: true,
      contracts: "1",
      entryTime: "09:00",
      exitTime: "09:30",
      direction: "long",
      entryPrice: "100",
      exitPrice: "110",
    })
    .returning({ id: trades.id });
  await tx.insert(tradeAccounts).values({ tradeId: trade.id, accountId });
}

async function rowFor(tx: Tx, userId: number, month: string) {
  const [row] = await tx
    .select()
    .from(monthlyScores)
    .where(
      and(eq(monthlyScores.userId, userId), eq(monthlyScores.month, month)),
    );
  return row;
}

describe("the month-close job", () => {
  it("freezes the previous month on the close day, real accounts only", async () => {
    const row = await inRollback(async (tx) => {
      const fixture = await createFixture(tx, "close-day");
      await addTrade(tx, fixture, "2026-09-01", fixture.realAccountId);
      // Practice-only: must not count as a logged day.
      await addTrade(tx, fixture, "2026-09-02", fixture.practiceAccountId);

      await runMonthCloseJob(new Date("2026-10-03T12:00:00Z"), tx);
      return rowFor(tx, fixture.userId, "2026-09");
    });

    expect(row).toBeDefined();
    expect(row?.showingUp).toBe("1.8182");
    // One by-the-book trade on a day without review, notes or grade.
    expect(row?.planAdherence).toBe("25.0000");
    expect(row?.completeness).toBe("0.0000");
    expect(row?.reviewHabit).toBe("0.0000");
    expect(row?.score).toBe(27);
  });

  it("writes nothing before the close day", async () => {
    const row = await inRollback(async (tx) => {
      const fixture = await createFixture(tx, "before-close");
      await addTrade(tx, fixture, "2026-09-01", fixture.realAccountId);

      await runMonthCloseJob(new Date("2026-10-02T12:00:00Z"), tx);
      return rowFor(tx, fixture.userId, "2026-09");
    });

    expect(row).toBeUndefined();
  });

  it("reads the close day in the user's own zone", async () => {
    const rows = await inRollback(async (tx) => {
      const berlin = await createFixture(tx, "zone-berlin", {
        timezone: "Europe/Berlin",
      });
      const utc = await createFixture(tx, "zone-utc");

      // 23:30 UTC on the 2nd is already the 3rd in Berlin.
      await runMonthCloseJob(new Date("2026-10-02T23:30:00Z"), tx);
      return {
        berlin: await rowFor(tx, berlin.userId, "2026-09"),
        utc: await rowFor(tx, utc.userId, "2026-09"),
      };
    });

    expect(rows.berlin).toBeDefined();
    expect(rows.utc).toBeUndefined();
  });

  it("overwrites on a second run on the close day", async () => {
    const row = await inRollback(async (tx) => {
      const fixture = await createFixture(tx, "close-day-rerun");
      await addTrade(tx, fixture, "2026-09-01", fixture.realAccountId);
      await runMonthCloseJob(new Date("2026-10-03T06:00:00Z"), tx);

      await addTrade(tx, fixture, "2026-09-02", fixture.realAccountId);
      await runMonthCloseJob(new Date("2026-10-03T18:00:00Z"), tx);

      const all = await tx
        .select()
        .from(monthlyScores)
        .where(eq(monthlyScores.userId, fixture.userId));
      expect(all).toHaveLength(1);
      return all[0];
    });

    expect(row.showingUp).toBe("3.6364");
  });

  it("leaves a frozen month alone after the close day", async () => {
    const row = await inRollback(async (tx) => {
      const fixture = await createFixture(tx, "frozen");
      await addTrade(tx, fixture, "2026-09-01", fixture.realAccountId);
      await runMonthCloseJob(new Date("2026-10-03T12:00:00Z"), tx);

      await addTrade(tx, fixture, "2026-09-02", fixture.realAccountId);
      await runMonthCloseJob(new Date("2026-10-04T12:00:00Z"), tx);
      return rowFor(tx, fixture.userId, "2026-09");
    });

    expect(row?.showingUp).toBe("1.8182");
  });

  it("catches up a month the close day missed", async () => {
    const row = await inRollback(async (tx) => {
      const fixture = await createFixture(tx, "catch-up");
      await addTrade(tx, fixture, "2026-09-01", fixture.realAccountId);

      await runMonthCloseJob(new Date("2026-10-05T12:00:00Z"), tx);
      return rowFor(tx, fixture.userId, "2026-09");
    });

    expect(row?.showingUp).toBe("1.8182");
  });

  it("writes a zero month for a user who logged nothing", async () => {
    const row = await inRollback(async (tx) => {
      const fixture = await createFixture(tx, "zero-month");
      await runMonthCloseJob(new Date("2026-10-03T12:00:00Z"), tx);
      return rowFor(tx, fixture.userId, "2026-09");
    });

    expect(row?.score).toBe(0);
    expect(row?.showingUp).toBe("0.0000");
    expect(row?.planAdherence).toBe("0.0000");
  });

  it("skips a month that ended before the user registered", async () => {
    const row = await inRollback(async (tx) => {
      const fixture = await createFixture(tx, "registered-late", {
        createdAt: new Date("2026-10-01T08:00:00Z"),
      });
      await runMonthCloseJob(new Date("2026-10-03T12:00:00Z"), tx);
      return rowFor(tx, fixture.userId, "2026-09");
    });

    expect(row).toBeUndefined();
  });
});

describe("reading frozen months", () => {
  it("lists them newest first and takes the best score", async () => {
    const result = await inRollback(async (tx) => {
      const fixture = await createFixture(tx, "history");
      const before = await getBestMonthlyScore(fixture.userId, tx);
      const parts = {
        showingUp: "0",
        completeness: "0",
        planAdherence: "0",
        reviewHabit: "0",
      };
      await tx.insert(monthlyScores).values([
        { userId: fixture.userId, month: "2026-07", score: 91, ...parts },
        { userId: fixture.userId, month: "2026-09", score: 40, ...parts },
        { userId: fixture.userId, month: "2026-08", score: 75, ...parts },
      ]);
      return {
        before,
        best: await getBestMonthlyScore(fixture.userId, tx),
        months: (await listMonthlyScores(fixture.userId, tx)).map(
          (row) => row.month,
        ),
      };
    });

    expect(result.before).toBe(0);
    expect(result.best).toBe(91);
    expect(result.months).toEqual(["2026-09", "2026-08", "2026-07"]);
  });
});

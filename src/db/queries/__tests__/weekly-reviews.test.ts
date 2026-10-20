import { eq, TransactionRollbackError } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { AccountCurrency } from "../../../domain/fx.ts";
import { reviewWeekRange } from "../../../domain/review-week.ts";
import { db } from "../../index.ts";
import { accounts } from "../../schema/accounts.ts";
import { fxRates } from "../../schema/fx-rates.ts";
import { instruments } from "../../schema/instruments.ts";
import {
  mistakeTags,
  tradeAccounts,
  tradeMistakes,
  trades,
} from "../../schema/trades.ts";
import { users } from "../../schema/users.ts";
import { weeklyReviews } from "../../schema/weekly-reviews.ts";
import { getMoneyMetrics } from "../dashboard.ts";
import {
  getWeeklyReview,
  getWeekSummary,
  listReviewedWeekStarts,
  upsertWeeklyReview,
  type WeekSummary,
} from "../weekly-reviews.ts";

// Drives the weekly-reviews query module against real Postgres, inside a
// rolled-back transaction like the other query tests.

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function fixture(
  body: (tx: Tx, userId: number, otherUserId: number) => Promise<void>,
) {
  try {
    await db.transaction(async (tx) => {
      const [user, other] = await tx
        .insert(users)
        .values([
          {
            username: "weekly-review-test",
            email: "weekly-review-test@users.invalid",
            displayName: "Weekly review test",
            timezone: "Europe/Berlin",
          },
          {
            username: "weekly-review-test-other",
            email: "weekly-review-test-other@users.invalid",
            displayName: "Weekly review test other",
            timezone: "Europe/Berlin",
          },
        ])
        .returning({ id: users.id });
      await body(tx, user.id, other.id);
      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }
}

const WEEK = "2026-10-18";

describe("weekly reviews", () => {
  it("reads back what was saved", async () => {
    await fixture(async (tx, userId) => {
      await upsertWeeklyReview(
        userId,
        WEEK,
        {
          whatWorked: "Waited for the retest",
          whatDidNotWork: null,
          focusNextWeek: "No trades before 9:45",
        },
        tx,
      );

      expect(await getWeeklyReview(userId, WEEK, tx)).toEqual({
        weekStart: WEEK,
        whatWorked: "Waited for the retest",
        whatDidNotWork: null,
        focusNextWeek: "No trades before 9:45",
      });
    });
  });

  it("returns null for a week without a review", async () => {
    await fixture(async (tx, userId) => {
      expect(await getWeeklyReview(userId, WEEK, tx)).toBeNull();
    });
  });

  it("replaces the week's review on a second save instead of adding one", async () => {
    await fixture(async (tx, userId) => {
      await upsertWeeklyReview(
        userId,
        WEEK,
        {
          whatWorked: "First draft",
          whatDidNotWork: "Chased the open",
          focusNextWeek: null,
        },
        tx,
      );
      await upsertWeeklyReview(
        userId,
        WEEK,
        {
          whatWorked: "Second draft",
          whatDidNotWork: null,
          focusNextWeek: "One setup only",
        },
        tx,
      );

      const rows = await tx
        .select()
        .from(weeklyReviews)
        .where(eq(weeklyReviews.userId, userId));
      expect(rows).toHaveLength(1);
      expect(await getWeeklyReview(userId, WEEK, tx)).toEqual({
        weekStart: WEEK,
        whatWorked: "Second draft",
        whatDidNotWork: null,
        focusNextWeek: "One setup only",
      });
    });
  });

  it("keeps another user's review invisible", async () => {
    await fixture(async (tx, userId, otherUserId) => {
      await upsertWeeklyReview(
        otherUserId,
        WEEK,
        { whatWorked: "Theirs", whatDidNotWork: null, focusNextWeek: null },
        tx,
      );

      expect(await getWeeklyReview(userId, WEEK, tx)).toBeNull();
    });
  });
});

describe("listReviewedWeekStarts", () => {
  const written = {
    whatWorked: "Kept to the plan",
    whatDidNotWork: null,
    focusNextWeek: null,
  };

  it("lists the user's reviewed weeks inside the range, oldest first", async () => {
    await fixture(async (tx, userId, otherUserId) => {
      await upsertWeeklyReview(userId, "2026-10-18", written, tx);
      await upsertWeeklyReview(userId, "2026-10-04", written, tx);
      // Outside the range on both ends.
      await upsertWeeklyReview(userId, "2026-08-23", written, tx);
      await upsertWeeklyReview(userId, "2026-10-25", written, tx);
      // Another user's week inside the range.
      await upsertWeeklyReview(otherUserId, "2026-10-11", written, tx);

      expect(
        await listReviewedWeekStarts(userId, "2026-08-30", "2026-10-18", tx),
      ).toEqual(["2026-10-04", "2026-10-18"]);
    });
  });

  it("does not count a review whose fields were all cleared", async () => {
    await fixture(async (tx, userId) => {
      await upsertWeeklyReview(
        userId,
        "2026-10-11",
        { whatWorked: null, whatDidNotWork: null, focusNextWeek: null },
        tx,
      );

      expect(
        await listReviewedWeekStarts(userId, "2026-10-11", "2026-10-11", tx),
      ).toEqual([]);
    });
  });
});

// --- Week summary -----------------------------------------------------------
// Review week 2026-10-18 (Sun) to 2026-10-23 (Fri). Saturdays 10-17 and 10-24
// sit on either side of it.

const SUMMARY_WEEK = "2026-10-18";
const SUMMARY_INSTRUMENT_SYMBOL = "TEST-WEEKLY-REVIEW";

interface SummaryTrade {
  tradeDate: string;
  /** Account names the trade was copied onto; empty for a missed setup. */
  on: string[];
  taken?: boolean;
  byTheBook?: boolean;
  mistakes?: string[];
  /** Entry is 100; without one the trade wins 10 points, $500 per account. */
  exitPrice?: string;
  /** Commission per account name, in USD dollars, e.g. `{ A: "3.00" }`. */
  commission?: Record<string, string>;
}

interface SummaryFixture {
  /** Account name to `is_practice`. */
  accounts: Record<string, boolean>;
  trades: SummaryTrade[];
  /** The currency of every fixture account; USD when left out. */
  currency?: AccountCurrency;
}

async function summaryFor(week: SummaryFixture): Promise<WeekSummary> {
  return readWeek(week, (userId, tx) =>
    getWeekSummary({ userId, currency: week.currency }, SUMMARY_WEEK, tx),
  );
}

// Builds the week inside a rolled-back transaction and runs one read against
// it, the shape of `readFixture` in dashboard.test.ts.
async function readWeek<T>(
  week: SummaryFixture,
  read: (userId: number, tx: Tx) => Promise<T>,
): Promise<T> {
  // Assigned inside the transaction callback, which TypeScript cannot follow.
  let result = null as T | null;

  await fixture(async (tx, userId) => {
    const [instrument] = await tx
      .insert(instruments)
      .values({
        symbol: SUMMARY_INSTRUMENT_SYMBOL,
        name: "Throwaway test instrument",
        pointValue: "50",
        tickSize: "0.25",
      })
      .returning({ id: instruments.id });

    const accountIds = new Map<string, number>();
    let sortOrder = 0;
    for (const [name, isPractice] of Object.entries(week.accounts)) {
      const [account] = await tx
        .insert(accounts)
        .values({
          userId,
          name,
          sortOrder: sortOrder++,
          isPractice,
          currency: week.currency ?? "USD",
        })
        .returning({ id: accounts.id });
      accountIds.set(name, account.id);
    }

    const tagIds = new Map<string, number>();
    for (const fixtureTrade of week.trades) {
      const taken = fixtureTrade.taken ?? true;
      const [trade] = await tx
        .insert(trades)
        .values({
          userId,
          tradeDate: fixtureTrade.tradeDate,
          instrumentId: instrument.id,
          taken,
          contracts: taken ? "1" : null,
          entryTime: "09:00",
          exitTime: taken ? "09:30" : null,
          direction: "long",
          entryPrice: "100",
          exitPrice: taken ? (fixtureTrade.exitPrice ?? "110") : null,
          byTheBook: fixtureTrade.byTheBook ?? false,
        })
        .returning({ id: trades.id });

      for (const name of fixtureTrade.on) {
        const accountId = accountIds.get(name);
        if (accountId === undefined) {
          throw new Error(`Fixture account "${name}" was never created`);
        }
        const commission = fixtureTrade.commission?.[name] ?? null;
        await tx.insert(tradeAccounts).values({
          tradeId: trade.id,
          accountId,
          commission,
          commissionSource: commission === null ? null : "file",
        });
      }

      for (const label of fixtureTrade.mistakes ?? []) {
        let tagId = tagIds.get(label);
        if (tagId === undefined) {
          const [tag] = await tx
            .insert(mistakeTags)
            .values({ label: `TEST-WR ${label}` })
            .returning({ id: mistakeTags.id });
          tagId = tag.id;
          tagIds.set(label, tagId);
        }
        await tx
          .insert(tradeMistakes)
          .values({ tradeId: trade.id, mistakeTagId: tagId });
      }
    }

    result = await read(userId, tx);
  });

  if (result === null) throw new Error("Fixture never produced a result");
  return result;
}

describe("getWeekSummary", () => {
  it("is empty for a week without entries", async () => {
    const summary = await summaryFor({ accounts: { Live: false }, trades: [] });

    expect(summary).toEqual({
      loggedDays: 0,
      takenTrades: 0,
      byTheBookTrades: 0,
      missedSetups: 0,
      topMistakes: [],
      netPnlCents: 0,
    });
  });

  it("counts a Sunday entry for the week it opens and ignores both Saturdays", async () => {
    const summary = await summaryFor({
      accounts: { Live: false },
      trades: [
        { tradeDate: "2026-10-17", on: ["Live"] }, // Saturday before
        { tradeDate: "2026-10-18", on: ["Live"] }, // Sunday → Monday
        { tradeDate: "2026-10-24", on: ["Live"] }, // Saturday after
      ],
    });

    expect(summary.loggedDays).toBe(1);
    expect(summary.takenTrades).toBe(1);
  });

  it("folds a Sunday and a Monday entry onto one logged day", async () => {
    const summary = await summaryFor({
      accounts: { Live: false },
      trades: [
        { tradeDate: "2026-10-18", on: ["Live"] },
        { tradeDate: "2026-10-19", on: ["Live"] },
        { tradeDate: "2026-10-21", on: ["Live"] },
        { tradeDate: "2026-10-21", on: ["Live"] },
      ],
    });

    expect(summary.loggedDays).toBe(2);
    expect(summary.takenTrades).toBe(4);
  });

  it("excludes trades on practice accounts only", async () => {
    const summary = await summaryFor({
      accounts: { Live: false, Sim: true },
      trades: [
        { tradeDate: "2026-10-19", on: ["Sim"], byTheBook: true },
        { tradeDate: "2026-10-20", on: ["Sim", "Live"], byTheBook: true },
      ],
    });

    expect(summary.loggedDays).toBe(1);
    expect(summary.takenTrades).toBe(1);
    expect(summary.byTheBookTrades).toBe(1);
  });

  it("counts a copy trade once", async () => {
    const summary = await summaryFor({
      accounts: { A: false, B: false, C: false },
      trades: [
        { tradeDate: "2026-10-20", on: ["A", "B", "C"], byTheBook: true },
        { tradeDate: "2026-10-20", on: ["A", "B", "C"], byTheBook: false },
      ],
    });

    expect(summary.takenTrades).toBe(2);
    expect(summary.byTheBookTrades).toBe(1);
  });

  it("counts missed setups as logged and as missed, never as taken", async () => {
    const summary = await summaryFor({
      accounts: { Live: false },
      trades: [
        { tradeDate: "2026-10-20", on: [], taken: false },
        { tradeDate: "2026-10-22", on: [], taken: false, byTheBook: true },
        { tradeDate: "2026-10-22", on: ["Live"] },
      ],
    });

    expect(summary.loggedDays).toBe(2);
    expect(summary.missedSetups).toBe(2);
    expect(summary.takenTrades).toBe(1);
    expect(summary.byTheBookTrades).toBe(0);
  });

  it("lists the three most frequent mistakes, a copy trade once, practice never", async () => {
    const summary = await summaryFor({
      accounts: { A: false, B: false, Sim: true },
      trades: [
        // Chased: 3 entries, one of them copied onto two real accounts.
        { tradeDate: "2026-10-19", on: ["A", "B"], mistakes: ["Chased"] },
        {
          tradeDate: "2026-10-20",
          on: ["A"],
          mistakes: ["Chased", "Early exit"],
        },
        { tradeDate: "2026-10-21", on: [], taken: false, mistakes: ["Chased"] },
        // Early exit: 2. Moved stop: 2, ties sort by label.
        {
          tradeDate: "2026-10-22",
          on: ["A"],
          mistakes: ["Early exit", "Moved stop"],
        },
        { tradeDate: "2026-10-23", on: ["B"], mistakes: ["Moved stop"] },
        // Oversized: 1, the fourth and so left out.
        { tradeDate: "2026-10-23", on: ["A"], mistakes: ["Oversized"] },
        // Practice only: never counted, however often.
        { tradeDate: "2026-10-19", on: ["Sim"], mistakes: ["Revenge"] },
        { tradeDate: "2026-10-20", on: ["Sim"], mistakes: ["Revenge"] },
        { tradeDate: "2026-10-21", on: ["Sim"], mistakes: ["Revenge"] },
        { tradeDate: "2026-10-22", on: ["Sim"], mistakes: ["Revenge"] },
        // Outside the week.
        {
          tradeDate: "2026-10-16",
          on: ["A"],
          mistakes: ["Oversized", "Oversized2"],
        },
      ],
    });

    expect(summary.topMistakes).toEqual([
      { label: "TEST-WR Chased", count: 3 },
      { label: "TEST-WR Early exit", count: 2 },
      { label: "TEST-WR Moved stop", count: 2 },
    ]);
  });

  it("sums Net P&L once per real account, never practice or missed setups", async () => {
    const summary = await summaryFor({
      accounts: { A: false, B: false, Sim: true },
      trades: [
        // +$500 on each of two real accounts; the practice copy drops out.
        { tradeDate: "2026-10-20", on: ["A", "B", "Sim"] },
        // Practice only: no real account, no Net P&L.
        { tradeDate: "2026-10-21", on: ["Sim"], exitPrice: "130" },
        // A missed setup carries no P&L at all.
        { tradeDate: "2026-10-22", on: [], taken: false },
      ],
    });

    expect(summary.netPnlCents).toBe(100_000);
  });

  for (const currency of ["USD", "EUR"] as const) {
    it(`matches the dashboard's Net P&L for the same week in ${currency}`, async () => {
      const week: SummaryFixture = {
        accounts: { A: false, B: false, Sim: true },
        currency,
        trades: [
          {
            tradeDate: "2026-10-18",
            on: ["A", "B"],
            commission: { A: "4.10", B: "4.10" },
          },
          { tradeDate: "2026-10-20", on: ["A", "Sim"], exitPrice: "93.25" },
          {
            tradeDate: "2026-10-22",
            on: ["B"],
            exitPrice: "101.5",
            commission: { B: "2.05" },
          },
          { tradeDate: "2026-10-23", on: [], taken: false },
          // Outside the week on both sides.
          { tradeDate: "2026-10-16", on: ["A"] },
          { tradeDate: "2026-10-24", on: ["A"] },
        ],
      };

      const { summary, dashboard } = await readWeek(
        week,
        async (userId, tx) => {
          // Rates for the week's trade dates, in case the local table lacks
          // them; an existing rate stays, both reads use the same one.
          await tx
            .insert(fxRates)
            .values(
              [
                "2026-10-16",
                "2026-10-18",
                "2026-10-20",
                "2026-10-22",
                "2026-10-23",
                "2026-10-24",
              ].map((rateDate) => ({
                currency: "EUR",
                rateDate,
                rateVsUsd: "1.1600000000",
              })),
            )
            .onConflictDoNothing();
          const scope = { userId, selectedAccountId: null, currency };
          return {
            summary: await getWeekSummary(scope, SUMMARY_WEEK, tx),
            dashboard: await getMoneyMetrics(
              scope,
              reviewWeekRange(SUMMARY_WEEK),
              tx,
            ),
          };
        },
      );

      expect(summary.netPnlCents).not.toBe(0);
      expect(summary.netPnlCents).toBe(dashboard.netPnlCents);
    });
  }
});

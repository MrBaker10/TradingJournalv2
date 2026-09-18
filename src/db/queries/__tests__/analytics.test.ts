import { TransactionRollbackError } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type {
  DimensionAggregateRow,
  MissedAggregateRow,
} from "../../../domain/analytics.ts";
import { db } from "../../index.ts";
import { accounts } from "../../schema/accounts.ts";
import { instruments } from "../../schema/instruments.ts";
import { tradeAccounts, trades } from "../../schema/trades.ts";
import { users } from "../../schema/users.ts";
import {
  getDimensionBreakdowns,
  getMissedSetupBreakdowns,
} from "../analytics.ts";
import type { QueryScope } from "../scope.ts";

// The SQL, against real Postgres arithmetic, inside a transaction that is
// always rolled back — the harness dashboard.test.ts and trades.test.ts use.
//
// What is pinned here is the part TypeScript cannot check: that the eleven
// UNION ALL branches are valid SQL, and that the two money rules survive the
// account fan-out. `src/domain/__tests__/analytics.test.ts` covers the
// arithmetic on top of these rows.

const TEST_INSTRUMENT_SYMBOL = "TEST-ANALYTICS";

interface FixtureTrade {
  /** Which fixture accounts this trade ran on, by name. */
  on: string[];
  taken?: boolean;
  setupType?: string;
  session?: string;
  /** Long, entry 100. An exit of 110 with point value 50 nets $500. */
  exitPrice?: string;
  stopPrice?: string;
  tradeDate?: string;
}

interface Fixture {
  /** Account name to `is_practice`. */
  accounts: Record<string, boolean>;
  trades: FixtureTrade[];
  /** null = "All accounts"; a name selects that fixture account. */
  selected?: string;
}

interface Result {
  dimensions: DimensionAggregateRow[];
  missed: MissedAggregateRow[];
}

async function run(fixture: Fixture): Promise<Result> {
  let result: Result | null = null;

  try {
    await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          username: "analytics-fixture",
          displayName: "Analytics Fixture",
          timezone: "UTC",
        })
        .returning({ id: users.id });

      const [instrument] = await tx
        .insert(instruments)
        .values({
          symbol: TEST_INSTRUMENT_SYMBOL,
          name: "Throwaway test instrument",
          pointValue: "50",
          tickSize: "0.25",
        })
        .returning({ id: instruments.id });

      const accountIds = new Map<string, number>();
      let sortOrder = 0;
      for (const [name, isPractice] of Object.entries(fixture.accounts)) {
        const [account] = await tx
          .insert(accounts)
          .values({
            userId: user.id,
            name,
            sortOrder: sortOrder++,
            isPractice,
          })
          .returning({ id: accounts.id });
        accountIds.set(name, account.id);
      }

      for (const fixtureTrade of fixture.trades) {
        const taken = fixtureTrade.taken ?? true;
        const [trade] = await tx
          .insert(trades)
          .values({
            userId: user.id,
            tradeDate: fixtureTrade.tradeDate ?? "2026-03-04",
            instrumentId: instrument.id,
            taken,
            contracts: taken ? 1 : null,
            entryTime: "09:00",
            direction: "long",
            entryPrice: "100",
            exitPrice: taken ? (fixtureTrade.exitPrice ?? "110") : null,
            stopPrice: fixtureTrade.stopPrice ?? null,
            setupType: fixtureTrade.setupType ?? null,
            session: fixtureTrade.session ?? null,
          })
          .returning({ id: trades.id });

        for (const name of fixtureTrade.on) {
          const accountId = accountIds.get(name);
          if (accountId === undefined) {
            throw new Error(`Fixture account "${name}" was never created`);
          }
          await tx
            .insert(tradeAccounts)
            .values({ tradeId: trade.id, accountId });
        }
      }

      const scope: QueryScope = {
        userId: user.id,
        selectedAccountId:
          fixture.selected === undefined
            ? null
            : (accountIds.get(fixture.selected) ?? null),
      };

      result = {
        dimensions: await getDimensionBreakdowns(scope, undefined, tx),
        missed: await getMissedSetupBreakdowns(scope, undefined, tx),
      };

      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }

  if (result === null) throw new Error("Fixture never produced a result");
  return result;
}

function pick(
  rows: DimensionAggregateRow[],
  dimension: DimensionAggregateRow["dimension"],
): DimensionAggregateRow[] {
  return rows.filter((row) => row.dimension === dimension);
}

function bucket(
  rows: DimensionAggregateRow[],
  dimension: DimensionAggregateRow["dimension"],
  name: string | null,
): DimensionAggregateRow | undefined {
  return pick(rows, dimension).find((row) => row.bucket === name);
}

describe("getDimensionBreakdowns", () => {
  it("returns a row set for all eleven dimensions", async () => {
    const { dimensions } = await run({
      accounts: { Live: false },
      trades: [{ on: ["Live"], setupType: "Reversal", session: "NY-AM" }],
    });

    expect(new Set(dimensions.map((row) => row.dimension))).toEqual(
      new Set([
        "account",
        "setupType",
        "entryModel",
        "session",
        "instrument",
        "weekday",
        "hour",
        "confluence",
        "felt",
        "grade",
        "mistake",
      ]),
    );
  });

  describe("money multiplies, counts do not", () => {
    it("counts a copy-trade once per real account in net P&L", async () => {
      // One execution, +$500, on three real accounts: $1,500 of P&L and
      // one trade logged.
      const { dimensions } = await run({
        accounts: { A: false, B: false, C: false },
        trades: [{ on: ["A", "B", "C"], setupType: "Reversal" }],
      });

      const row = bucket(dimensions, "setupType", "Reversal");
      expect(row?.netPnlCents).toBe(150000);
      expect(row?.trades).toBe(1);
      expect(row?.wins).toBe(1);
    });

    it("gives the account dimension the per-account value, unmultiplied", async () => {
      const { dimensions } = await run({
        accounts: { A: false, B: false, C: false },
        trades: [{ on: ["A", "B", "C"], setupType: "Reversal" }],
      });

      const byAccount = pick(dimensions, "account");
      expect(byAccount.map((row) => row.netPnlCents)).toEqual([
        50000, 50000, 50000,
      ]);
      // And the dimension still adds up to the multiplied figure.
      const total = byAccount.reduce((sum, row) => sum + row.netPnlCents, 0);
      expect(total).toBe(150000);
    });
  });

  describe("practice accounts", () => {
    it("excludes a practice account from the multiplier", async () => {
      // Two real accounts and one practice account: $1,000, not $1,500.
      const { dimensions } = await run({
        accounts: { A: false, B: false, Demo: true },
        trades: [{ on: ["A", "B", "Demo"], setupType: "Reversal" }],
      });

      expect(bucket(dimensions, "setupType", "Reversal")?.netPnlCents).toBe(
        100000,
      );
      expect(pick(dimensions, "account").map((row) => row.bucket)).toEqual([
        "A",
        "B",
      ]);
    });

    it("drops a trade that ran only on practice accounts", async () => {
      const { dimensions } = await run({
        accounts: { Live: false, Demo: true },
        trades: [
          { on: ["Live"], setupType: "Reversal" },
          { on: ["Demo"], setupType: "Continuation" },
        ],
      });

      expect(bucket(dimensions, "setupType", "Continuation")).toBeUndefined();
      expect(bucket(dimensions, "setupType", "Reversal")?.trades).toBe(1);
    });

    it("shows a practice account's own figures when it is selected alone", async () => {
      const { dimensions } = await run({
        accounts: { Live: false, Demo: true },
        trades: [
          { on: ["Live"], setupType: "Reversal" },
          { on: ["Demo"], setupType: "Continuation" },
        ],
        selected: "Demo",
      });

      expect(bucket(dimensions, "setupType", "Continuation")?.netPnlCents).toBe(
        50000,
      );
      expect(bucket(dimensions, "setupType", "Reversal")).toBeUndefined();
      expect(pick(dimensions, "account").map((row) => row.bucket)).toEqual([
        "Demo",
      ]);
    });

    it("does not multiply while one account is selected", async () => {
      const { dimensions } = await run({
        accounts: { A: false, B: false },
        trades: [{ on: ["A", "B"], setupType: "Reversal" }],
        selected: "A",
      });

      expect(bucket(dimensions, "setupType", "Reversal")?.netPnlCents).toBe(
        50000,
      );
    });
  });

  describe("buckets", () => {
    it("returns a null bucket for a field the trade left empty", async () => {
      const { dimensions } = await run({
        accounts: { Live: false },
        trades: [{ on: ["Live"] }],
      });

      expect(bucket(dimensions, "setupType", null)?.trades).toBe(1);
      expect(bucket(dimensions, "felt", null)?.trades).toBe(1);
    });

    it("puts a trade with no confluence in the null bucket, not out of the table", async () => {
      const { dimensions } = await run({
        accounts: { Live: false },
        trades: [{ on: ["Live"] }],
      });

      expect(bucket(dimensions, "confluence", null)?.trades).toBe(1);
      expect(bucket(dimensions, "mistake", null)?.trades).toBe(1);
    });

    it("groups the weekday as a Postgres day-of-week number", async () => {
      // 2026-03-04 is a Wednesday, which extract(dow ...) calls 3.
      const { dimensions } = await run({
        accounts: { Live: false },
        trades: [{ on: ["Live"], tradeDate: "2026-03-04" }],
      });

      expect(pick(dimensions, "weekday").map((row) => row.bucket)).toEqual([
        "3",
      ]);
    });

    it("groups the hour off the unconverted chart clock", async () => {
      const { dimensions } = await run({
        accounts: { Live: false },
        trades: [{ on: ["Live"] }],
      });

      expect(pick(dimensions, "hour").map((row) => row.bucket)).toEqual(["9"]);
    });
  });

  describe("R", () => {
    it("sums R only over the trades that had a stop price", async () => {
      // Entry 100, stop 95, exit 110 → risk 5 points, reward 10 → R = 2.
      const { dimensions } = await run({
        accounts: { Live: false },
        trades: [
          { on: ["Live"], setupType: "Reversal", stopPrice: "95" },
          { on: ["Live"], setupType: "Reversal" },
        ],
      });

      const row = bucket(dimensions, "setupType", "Reversal");
      expect(row?.trades).toBe(2);
      expect(row?.rCount).toBe(1);
      expect(row?.rSum).toBe(2);
    });
  });

  it("leaves missed setups out of every dimension table", async () => {
    const { dimensions } = await run({
      accounts: { Live: false },
      trades: [
        { on: ["Live"], setupType: "Reversal" },
        { on: [], taken: false, setupType: "Continuation" },
      ],
    });

    expect(bucket(dimensions, "setupType", "Continuation")).toBeUndefined();
  });
});

describe("getMissedSetupBreakdowns", () => {
  it("counts missed entries against all entries of the bucket", async () => {
    const { missed } = await run({
      accounts: { Live: false },
      trades: [
        { on: ["Live"], session: "NY-AM" },
        { on: [], taken: false, session: "NY-AM" },
        { on: [], taken: false, session: "NY-AM" },
      ],
    });

    const row = missed.find(
      (candidate) =>
        candidate.dimension === "session" && candidate.bucket === "NY-AM",
    );
    expect(row?.missed).toBe(2);
    expect(row?.entries).toBe(3);
  });

  it("covers the four missed dimensions and nothing else", async () => {
    const { missed } = await run({
      accounts: { Live: false },
      trades: [{ on: [], taken: false, session: "London" }],
    });

    expect(new Set(missed.map((row) => row.dimension))).toEqual(
      new Set(["setupType", "session", "instrument", "weekday"]),
    );
  });

  it("keeps missed setups visible while a single account is selected", async () => {
    // A missed setup carries no account assignment at all, so there is
    // nothing to filter it by — the same rule isVisibleForAccount encodes.
    const { missed } = await run({
      accounts: { Live: false, Other: false },
      trades: [{ on: [], taken: false, session: "London" }],
      selected: "Other",
    });

    const row = missed.find(
      (candidate) =>
        candidate.dimension === "session" && candidate.bucket === "London",
    );
    expect(row?.missed).toBe(1);
  });
});

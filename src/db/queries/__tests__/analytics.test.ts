import { TransactionRollbackError } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type {
  DimensionAggregateRow,
  MissedAggregateRow,
} from "../../../domain/analytics.ts";
import {
  bucketIndexOf,
  type ExcursionCount,
  type Outcome,
} from "../../../domain/execution.ts";
import { db } from "../../index.ts";
import { accounts } from "../../schema/accounts.ts";
import { instruments } from "../../schema/instruments.ts";
import { tradeAccounts, trades } from "../../schema/trades.ts";
import { users } from "../../schema/users.ts";
import {
  type ExecutionSummaryRow,
  getDimensionBreakdowns,
  getExcursionBuckets,
  getExecutionSummary,
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
  /** Chart clock. An exit earlier than the entry is an overnight trade. */
  entryTime?: string;
  exitTime?: string;
  mfeR?: string;
  maeR?: string;
  postExitMfeR?: string;
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
  execution: ExecutionSummaryRow[];
  excursions: ExcursionCount[];
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
            entryTime: fixtureTrade.entryTime ?? "09:00",
            exitTime: taken ? (fixtureTrade.exitTime ?? "09:30") : null,
            direction: "long",
            entryPrice: "100",
            exitPrice: taken ? (fixtureTrade.exitPrice ?? "110") : null,
            stopPrice: fixtureTrade.stopPrice ?? null,
            setupType: fixtureTrade.setupType ?? null,
            session: fixtureTrade.session ?? null,
            mfeR: fixtureTrade.mfeR ?? null,
            maeR: fixtureTrade.maeR ?? null,
            postExitMfeR: fixtureTrade.postExitMfeR ?? null,
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
        execution: await getExecutionSummary(scope, undefined, tx),
        excursions: await getExcursionBuckets(scope, undefined, tx),
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

// --- Execution (S12b) ----------------------------------------------------
// The fixture instrument has point value 50, every trade enters at 100. With
// a stop at 95 the risk is 5 points, so an exit at 110 is +2R and an exit at
// 95 is -1R. Those two numbers are what the expectations below are built on.

function outcomeRow(
  rows: ExecutionSummaryRow[],
  outcome: Outcome,
): ExecutionSummaryRow | undefined {
  return rows.find((row) => row.outcome === outcome);
}

describe("getExecutionSummary", () => {
  describe("hold time", () => {
    it("measures the clock difference in minutes", async () => {
      const { execution } = await run({
        accounts: { Live: false },
        trades: [
          { on: ["Live"], entryTime: "09:00", exitTime: "09:30" },
          { on: ["Live"], entryTime: "10:00", exitTime: "11:30" },
        ],
      });

      const winners = outcomeRow(execution, "winner");
      expect(winners?.holdTrades).toBe(2);
      expect(winners?.holdMinutes).toBe(60);
    });

    it("reads an exit before the entry as an overnight trade", async () => {
      // 22:30 to 01:15 is 2h45, not a negative duration and not 21 hours.
      const { execution } = await run({
        accounts: { Live: false },
        trades: [{ on: ["Live"], entryTime: "22:30", exitTime: "01:15" }],
      });

      expect(outcomeRow(execution, "winner")?.holdMinutes).toBe(165);
    });

    it("keeps winners and losers apart", async () => {
      const { execution } = await run({
        accounts: { Live: false },
        trades: [
          { on: ["Live"], entryTime: "09:00", exitTime: "09:30" },
          {
            on: ["Live"],
            exitPrice: "90",
            entryTime: "14:00",
            exitTime: "14:15",
          },
        ],
      });

      expect(outcomeRow(execution, "winner")?.holdMinutes).toBe(30);
      expect(outcomeRow(execution, "loser")?.holdMinutes).toBe(15);
    });

    it("counts a copy-trade once, not once per account", async () => {
      // coding-standards.md: hold time and MFE/MAE are count aggregates.
      const { execution } = await run({
        accounts: { A: false, B: false, C: false },
        trades: [
          { on: ["A", "B", "C"], entryTime: "09:00", exitTime: "09:30" },
        ],
      });

      expect(outcomeRow(execution, "winner")?.holdTrades).toBe(1);
    });
  });

  describe("risk calibration", () => {
    it("averages MAE by magnitude, whichever sign was typed", async () => {
      const { execution } = await run({
        accounts: { Live: false },
        trades: [
          { on: ["Live"], stopPrice: "95", maeR: "-0.30", mfeR: "2.50" },
          { on: ["Live"], stopPrice: "95", maeR: "0.20", mfeR: "1.50" },
        ],
      });

      const winners = outcomeRow(execution, "winner");
      expect(winners?.avgMaeR).toBeCloseTo(0.25, 10);
      expect(winners?.avgMfeR).toBeCloseTo(2.0, 10);
      expect(winners?.maeTrades).toBe(2);
    });

    it("averages MFE by magnitude too, so the number agrees with its bars", async () => {
      // Found in review: the bucketing always used abs(), the average did not.
      // A negative MFE then sat in the 2–3R bar while the average read -2.50R,
      // and one card contradicted itself.
      const { execution, excursions } = await run({
        accounts: { Live: false },
        trades: [{ on: ["Live"], stopPrice: "95", mfeR: "-2.50" }],
      });

      expect(outcomeRow(execution, "winner")?.avgMfeR).toBeCloseTo(2.5, 10);
      expect(excursions.find((row) => row.kind === "mfe")?.bucketIndex).toBe(
        bucketIndexOf("mfe", 2.5),
      );
    });

    it("counts only the trades that carry a value", async () => {
      const { execution } = await run({
        accounts: { Live: false },
        trades: [
          { on: ["Live"], stopPrice: "95", maeR: "0.50" },
          { on: ["Live"] },
          { on: ["Live"] },
        ],
      });

      const winners = outcomeRow(execution, "winner");
      expect(winners?.maeTrades).toBe(1);
      expect(winners?.avgMaeR).toBeCloseTo(0.5, 10);
      expect(winners?.holdTrades).toBe(3);
    });

    it("ignores an excursion on a trade without a stop price", async () => {
      // MFE and MAE are stored in R, and R needs a stop to be defined at all.
      // avg R has excluded these trades since S12a; these figures now agree.
      const { execution } = await run({
        accounts: { Live: false },
        trades: [
          { on: ["Live"], stopPrice: "95", maeR: "0.20" },
          { on: ["Live"], maeR: "0.90", mfeR: "3.00" },
        ],
      });

      const winners = outcomeRow(execution, "winner");
      expect(winners?.maeTrades).toBe(1);
      expect(winners?.avgMaeR).toBeCloseTo(0.2, 10);
      expect(winners?.mfeTrades).toBe(0);
      // The trade itself still counts everywhere it has a defined figure.
      expect(winners?.holdTrades).toBe(2);
    });

    it("has no average when nothing carried a value", async () => {
      const { execution } = await run({
        accounts: { Live: false },
        trades: [{ on: ["Live"] }],
      });

      expect(outcomeRow(execution, "winner")?.avgMaeR).toBeNull();
      expect(outcomeRow(execution, "winner")?.maeTrades).toBe(0);
    });
  });

  describe("exit efficiency", () => {
    it("averages the captured share over winners", async () => {
      // +2R giving back 1R is 2/3; +1R giving back 1R is 1/2.
      const { execution } = await run({
        accounts: { Live: false },
        trades: [
          {
            on: ["Live"],
            exitPrice: "110",
            stopPrice: "95",
            postExitMfeR: "1.00",
          },
          {
            on: ["Live"],
            exitPrice: "105",
            stopPrice: "95",
            postExitMfeR: "1.00",
          },
        ],
      });

      const winners = outcomeRow(execution, "winner");
      expect(winners?.capturedShare).toBeCloseTo((2 / 3 + 1 / 2) / 2, 6);
      expect(winners?.capturedTrades).toBe(2);
      expect(winners?.avgLeftOnTableR).toBeCloseTo(1.0, 10);
    });

    it("leaves losers out of both figures", async () => {
      const { execution } = await run({
        accounts: { Live: false },
        trades: [
          {
            on: ["Live"],
            exitPrice: "90",
            stopPrice: "95",
            postExitMfeR: "1.00",
          },
        ],
      });

      const losers = outcomeRow(execution, "loser");
      expect(losers?.capturedShare).toBeNull();
      expect(losers?.capturedTrades).toBe(0);
      expect(losers?.avgLeftOnTableR).toBeNull();
    });

    it("has no share without a stop price to measure R against", async () => {
      const { execution } = await run({
        accounts: { Live: false },
        trades: [{ on: ["Live"], exitPrice: "110", postExitMfeR: "1.00" }],
      });

      expect(outcomeRow(execution, "winner")?.capturedTrades).toBe(0);
    });
  });

  it("excludes missed setups, which have no exit and no excursion", async () => {
    const { execution } = await run({
      accounts: { Live: false },
      trades: [
        { on: ["Live"], entryTime: "09:00", exitTime: "09:30" },
        { on: [], taken: false, mfeR: "1.80" },
      ],
    });

    expect(outcomeRow(execution, "winner")?.holdTrades).toBe(1);
    expect(outcomeRow(execution, "winner")?.mfeTrades).toBe(0);
  });

  it("follows the practice filter like every other figure", async () => {
    const { execution } = await run({
      accounts: { Live: false, Demo: true },
      trades: [
        { on: ["Live"], stopPrice: "95", maeR: "0.20" },
        { on: ["Demo"], stopPrice: "95", maeR: "0.90" },
      ],
    });

    expect(outcomeRow(execution, "winner")?.avgMaeR).toBeCloseTo(0.2, 10);
    expect(outcomeRow(execution, "winner")?.maeTrades).toBe(1);
  });
});

describe("getExcursionBuckets", () => {
  it("buckets MAE by magnitude against the domain boundaries", async () => {
    const { excursions } = await run({
      accounts: { Live: false },
      trades: [
        { on: ["Live"], stopPrice: "95", maeR: "-0.30" },
        { on: ["Live"], stopPrice: "95", maeR: "0.20" },
        { on: ["Live"], stopPrice: "95", maeR: "1.40" },
      ],
    });

    const mae = excursions.filter((row) => row.kind === "mae");
    const byIndex = Object.fromEntries(
      mae.map((row) => [row.bucketIndex, row.trades]),
    );
    expect(byIndex[0]).toBe(1); // 0.20
    expect(byIndex[1]).toBe(1); // 0.30
    expect(byIndex[4]).toBe(1); // 1.40
  });

  it("agrees with bucketIndexOf on a boundary value", async () => {
    // The SQL CASE is generated from the same constants; this pins the pair.
    const { excursions } = await run({
      accounts: { Live: false },
      trades: [
        { on: ["Live"], stopPrice: "95", maeR: "0.25" },
        { on: ["Live"], stopPrice: "95", mfeR: "1.00" },
      ],
    });

    const mae = excursions.find((row) => row.kind === "mae");
    const mfe = excursions.find((row) => row.kind === "mfe");
    expect(mae?.bucketIndex).toBe(bucketIndexOf("mae", 0.25));
    expect(mfe?.bucketIndex).toBe(bucketIndexOf("mfe", 1.0));
  });

  it("splits the two kinds and the two outcomes", async () => {
    const { excursions } = await run({
      accounts: { Live: false },
      trades: [
        { on: ["Live"], stopPrice: "95", maeR: "0.20", mfeR: "2.50" },
        {
          on: ["Live"],
          exitPrice: "90",
          stopPrice: "95",
          maeR: "1.20",
          mfeR: "0.40",
        },
      ],
    });

    expect(
      excursions.find((row) => row.kind === "mae" && row.outcome === "winner")
        ?.bucketIndex,
    ).toBe(0);
    expect(
      excursions.find((row) => row.kind === "mae" && row.outcome === "loser")
        ?.bucketIndex,
    ).toBe(4);
    expect(
      excursions.find((row) => row.kind === "mfe" && row.outcome === "winner")
        ?.bucketIndex,
    ).toBe(3);
    expect(
      excursions.find((row) => row.kind === "mfe" && row.outcome === "loser")
        ?.bucketIndex,
    ).toBe(0);
  });

  it("leaves a stopless trade out of the distribution too", async () => {
    const { excursions } = await run({
      accounts: { Live: false },
      trades: [{ on: ["Live"], maeR: "0.20", mfeR: "2.50" }],
    });

    expect(excursions).toEqual([]);
  });

  it("returns nothing for a trade without excursion values", async () => {
    const { excursions } = await run({
      accounts: { Live: false },
      trades: [{ on: ["Live"] }],
    });

    expect(excursions).toEqual([]);
  });
});

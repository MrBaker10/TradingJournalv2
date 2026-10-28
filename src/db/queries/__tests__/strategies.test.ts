import { eq, TransactionRollbackError } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../../index.ts";
import { accounts } from "../../schema/accounts.ts";
import { instruments } from "../../schema/instruments.ts";
import { strategyRevisions } from "../../schema/strategies.ts";
import { tradeAccounts, trades } from "../../schema/trades.ts";
import { users } from "../../schema/users.ts";
import {
  archiveStrategy,
  createStrategy,
  getStrategy,
  getStrategyRevision,
  listStrategies,
  listStrategyTrades,
  reactivateStrategy,
  type StrategyContent,
  StrategyError,
  updateStrategy,
} from "../strategies.ts";

// Drives the strategy lifecycle and its public reads against real Postgres,
// inside a rolled-back transaction like the other query tests.

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
            username: "strategy-test",
            email: "strategy-test@users.invalid",
            displayName: "Strategy test",
            timezone: "Europe/Berlin",
          },
          {
            username: "strategy-test-other",
            email: "strategy-test-other@users.invalid",
            displayName: "Strategy test other",
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

const nameOnly = (name: string): StrategyContent => ({
  name,
  prerequisites: null,
  entry: null,
  stopRisk: null,
  exit: null,
  exclusions: null,
});

const fullRules: StrategyContent = {
  name: "Opening range break",
  prerequisites: "Trend day bias",
  entry: "Break and retest of the 5-minute range",
  stopRisk: "Behind the retest low, 0.5% risk",
  exit: "Prior day high",
  exclusions: "No trade on FOMC days",
};

describe("createStrategy and getStrategy", () => {
  it("creates a strategy from a name alone and reads it back", async () => {
    await fixture(async (tx, userId) => {
      const { id } = await createStrategy(userId, nameOnly("Reversal"), tx);

      expect(await getStrategy(userId, id, tx)).toMatchObject({
        id,
        archivedAt: null,
        ...nameOnly("Reversal"),
      });
    });
  });

  it("keeps all five chapters as plain text", async () => {
    await fixture(async (tx, userId) => {
      const { id } = await createStrategy(
        userId,
        { ...fullRules, entry: "<b>not markup</b>" },
        tx,
      );

      expect(await getStrategy(userId, id, tx)).toMatchObject({
        ...fullRules,
        entry: "<b>not markup</b>",
      });
    });
  });

  it("returns null for an unknown strategy", async () => {
    await fixture(async (tx, userId) => {
      expect(await getStrategy(userId, 2_000_000_000, tx)).toBeNull();
    });
  });
});

describe("listStrategies", () => {
  it("lists every strategy of the owner by name, with its current rules", async () => {
    await fixture(async (tx, userId) => {
      await createStrategy(userId, nameOnly("Reversal"), tx);
      const { id } = await createStrategy(userId, nameOnly("breakout"), tx);
      await updateStrategy(userId, id, nameOnly("Breakout v2"), tx);

      const list = await listStrategies(userId, tx);

      expect(list.map((strategy) => strategy.name)).toEqual([
        "Breakout v2",
        "Reversal",
      ]);
    });
  });

  it("shows nothing of another user's strategies", async () => {
    await fixture(async (tx, userId, otherUserId) => {
      await createStrategy(otherUserId, nameOnly("Private"), tx);

      expect(await listStrategies(userId, tx)).toEqual([]);
    });
  });
});

describe("updateStrategy", () => {
  it("appends a revision and leaves the earlier one untouched", async () => {
    await fixture(async (tx, userId) => {
      const created = await createStrategy(userId, fullRules, tx);

      const updated = await updateStrategy(
        userId,
        created.id,
        { ...fullRules, name: "ORB", exit: null },
        tx,
      );

      expect(updated.revisionId).not.toBe(created.revisionId);
      expect(await getStrategy(userId, created.id, tx)).toMatchObject({
        revisionId: updated.revisionId,
        name: "ORB",
        exit: null,
      });
      const original = await getStrategyRevision(
        userId,
        created.revisionId,
        tx,
      );
      expect(original).toMatchObject(fullRules);
    });
  });

  it("keeps the strategy's identity and owner across edits", async () => {
    await fixture(async (tx, userId) => {
      const { id } = await createStrategy(userId, nameOnly("A"), tx);
      await updateStrategy(userId, id, nameOnly("B"), tx);

      expect((await listStrategies(userId, tx)).map((s) => s.id)).toEqual([id]);
      const revisions = await tx
        .select({ id: strategyRevisions.id })
        .from(strategyRevisions)
        .where(eq(strategyRevisions.strategyId, id));
      expect(revisions).toHaveLength(2);
    });
  });

  it("appends nothing when the rules did not change", async () => {
    await fixture(async (tx, userId) => {
      const created = await createStrategy(userId, fullRules, tx);

      const saved = await updateStrategy(userId, created.id, fullRules, tx);

      expect(saved.revisionId).toBe(created.revisionId);
      const revisions = await tx
        .select({ id: strategyRevisions.id })
        .from(strategyRevisions)
        .where(eq(strategyRevisions.strategyId, created.id));
      expect(revisions).toHaveLength(1);
    });
  });

  it("refuses another user's strategy and changes nothing", async () => {
    await fixture(async (tx, userId, otherUserId) => {
      const { id, revisionId } = await createStrategy(
        otherUserId,
        nameOnly("Private"),
        tx,
      );

      await expect(
        updateStrategy(userId, id, nameOnly("Hijacked"), tx),
      ).rejects.toBeInstanceOf(StrategyError);

      expect(await getStrategy(otherUserId, id, tx)).toMatchObject({
        revisionId,
        name: "Private",
      });
    });
  });
});

describe("archiveStrategy and reactivateStrategy", () => {
  it("archives and reactivates without touching revisions or rules", async () => {
    await fixture(async (tx, userId) => {
      const { id } = await createStrategy(userId, nameOnly("A"), tx);
      const { revisionId } = await updateStrategy(userId, id, fullRules, tx);

      await archiveStrategy(userId, id, tx);
      const archived = await getStrategy(userId, id, tx);
      expect(archived?.archivedAt).toBeInstanceOf(Date);
      expect(archived?.revisionId).toBe(revisionId);
      expect(archived?.name).toBe(fullRules.name);
      expect(
        (await listStrategies(userId, tx)).map((strategy) => strategy.id),
      ).toEqual([id]);

      await reactivateStrategy(userId, id, tx);
      const reactivated = await getStrategy(userId, id, tx);
      expect(reactivated?.archivedAt).toBeNull();
      expect(reactivated?.revisionId).toBe(revisionId);

      const revisions = await tx
        .select({ id: strategyRevisions.id })
        .from(strategyRevisions)
        .where(eq(strategyRevisions.strategyId, id));
      expect(revisions).toHaveLength(2);
    });
  });

  it("keeps the first archive time when archiving twice", async () => {
    await fixture(async (tx, userId) => {
      const { id } = await createStrategy(userId, nameOnly("A"), tx);
      await archiveStrategy(userId, id, tx);
      const first = (await getStrategy(userId, id, tx))?.archivedAt;
      await archiveStrategy(userId, id, tx);
      expect((await getStrategy(userId, id, tx))?.archivedAt).toEqual(first);
    });
  });

  it("refuses another user's strategy and changes nothing", async () => {
    await fixture(async (tx, userId, otherUserId) => {
      const { id } = await createStrategy(otherUserId, nameOnly("Theirs"), tx);
      await expect(archiveStrategy(userId, id, tx)).rejects.toBeInstanceOf(
        StrategyError,
      );
      await archiveStrategy(otherUserId, id, tx);
      await expect(reactivateStrategy(userId, id, tx)).rejects.toBeInstanceOf(
        StrategyError,
      );
      expect(
        (await getStrategy(otherUserId, id, tx))?.archivedAt,
      ).toBeInstanceOf(Date);
    });
  });
});

describe("ownership of reads", () => {
  it("does not expose another user's strategy or revision", async () => {
    await fixture(async (tx, userId, otherUserId) => {
      const { id, revisionId } = await createStrategy(
        otherUserId,
        fullRules,
        tx,
      );

      expect(await getStrategy(userId, id, tx)).toBeNull();
      expect(await getStrategyRevision(userId, revisionId, tx)).toBeNull();
    });
  });
});

describe("listStrategyTrades", () => {
  /** A throwaway instrument and one real and one practice account. */
  async function tradeFixture(tx: Tx, userId: number) {
    const [instrument] = await tx
      .insert(instruments)
      .values({
        symbol: "TEST-STRATEGY-TRADES",
        name: "Throwaway test instrument",
        pointValue: "2",
        tickSize: "0.25",
      })
      .returning({ id: instruments.id });
    const [real, practice] = await tx
      .insert(accounts)
      .values([
        { userId, name: "Eval", sortOrder: 0 },
        { userId, name: "Sim", sortOrder: 1, isPractice: true },
      ])
      .returning({ id: accounts.id });

    async function addTrade(
      owner: number,
      revisionId: number,
      tradeDate: string,
      options: { taken?: boolean; accountId?: number } = {},
    ): Promise<number> {
      const taken = options.taken ?? true;
      const [row] = await tx
        .insert(trades)
        .values({
          userId: owner,
          tradeDate,
          instrumentId: instrument.id,
          taken,
          entryTime: "09:31:00",
          direction: "long",
          entryPrice: "100.0000",
          strategyRevisionId: revisionId,
        })
        .returning({ id: trades.id });
      if (taken) {
        await tx
          .insert(tradeAccounts)
          .values({ tradeId: row.id, accountId: options.accountId ?? real.id });
      }
      return row.id;
    }

    return { addTrade, realId: real.id, practiceId: practice.id };
  }

  it("lists each strategy's trades newest first, marking those on earlier rules", async () => {
    await fixture(async (tx, userId) => {
      const { addTrade } = await tradeFixture(tx, userId);
      const first = await createStrategy(userId, nameOnly("Reversal"), tx);
      const older = await addTrade(userId, first.revisionId, "2026-03-02");
      const { revisionId: current } = await updateStrategy(
        userId,
        first.id,
        fullRules,
        tx,
      );
      const newer = await addTrade(userId, current, "2026-03-05");
      const missed = await addTrade(userId, current, "2026-03-04", {
        taken: false,
      });

      expect(await listStrategyTrades(userId, tx)).toEqual([
        {
          id: newer,
          strategyId: first.id,
          tradeDate: "2026-03-05",
          taken: true,
          instrumentSymbol: "TEST-STRATEGY-TRADES",
          onCurrentRules: true,
          total: 3,
        },
        {
          id: missed,
          strategyId: first.id,
          tradeDate: "2026-03-04",
          taken: false,
          instrumentSymbol: "TEST-STRATEGY-TRADES",
          onCurrentRules: true,
          total: 3,
        },
        {
          id: older,
          strategyId: first.id,
          tradeDate: "2026-03-02",
          taken: true,
          instrumentSymbol: "TEST-STRATEGY-TRADES",
          onCurrentRules: false,
          total: 3,
        },
      ]);
    });
  });

  it("judges current rules per strategy, not across strategies", async () => {
    await fixture(async (tx, userId) => {
      const { addTrade } = await tradeFixture(tx, userId);
      const first = await createStrategy(userId, nameOnly("Reversal"), tx);
      const onFirst = await addTrade(userId, first.revisionId, "2026-03-02");
      // The second strategy's revision has the higher id of the two.
      const second = await createStrategy(userId, fullRules, tx);
      const onSecond = await addTrade(userId, second.revisionId, "2026-03-03");

      const rows = await listStrategyTrades(userId, tx);

      expect(
        rows.map((row) => [row.id, row.strategyId, row.onCurrentRules]),
      ).toEqual([
        [onFirst, first.id, true],
        [onSecond, second.id, true],
      ]);
    });
  });

  it("sees trades as All accounts does and never another user's", async () => {
    await fixture(async (tx, userId, otherUserId) => {
      const { addTrade, practiceId } = await tradeFixture(tx, userId);
      const mine = await createStrategy(userId, nameOnly("Reversal"), tx);
      const shown = await addTrade(userId, mine.revisionId, "2026-03-02");
      await addTrade(userId, mine.revisionId, "2026-03-03", {
        accountId: practiceId,
      });
      const theirs = await createStrategy(otherUserId, fullRules, tx);
      await addTrade(otherUserId, theirs.revisionId, "2026-03-04", {
        taken: false,
      });

      const rows = await listStrategyTrades(userId, tx);

      expect(rows.map((row) => [row.id, row.total])).toEqual([[shown, 1]]);
    });
  });

  it("lists the latest twenty of a strategy and counts all of them", async () => {
    await fixture(async (tx, userId) => {
      const { addTrade } = await tradeFixture(tx, userId);
      const strategy = await createStrategy(userId, nameOnly("Reversal"), tx);
      for (let day = 1; day <= 22; day++) {
        await addTrade(
          userId,
          strategy.revisionId,
          `2026-03-${String(day).padStart(2, "0")}`,
        );
      }

      const rows = await listStrategyTrades(userId, tx);

      expect(rows).toHaveLength(20);
      expect(rows[0]).toMatchObject({ tradeDate: "2026-03-22", total: 22 });
      expect(rows.at(-1)).toMatchObject({ tradeDate: "2026-03-03" });
    });
  });
});

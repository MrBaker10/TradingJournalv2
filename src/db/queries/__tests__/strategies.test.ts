import { eq, TransactionRollbackError } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../../index.ts";
import { strategyRevisions } from "../../schema/strategies.ts";
import { users } from "../../schema/users.ts";
import {
  createStrategy,
  getStrategy,
  getStrategyRevision,
  listStrategies,
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

import { eq, TransactionRollbackError } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { DEMO_USERNAME } from "../../../domain/demo.ts";
import type { SetupStepKey } from "../../../domain/setup-guide.ts";
import { db } from "../../index.ts";
import { accountRules } from "../../schema/account-rules.ts";
import { accounts } from "../../schema/accounts.ts";
import { checklistTemplateItems } from "../../schema/checklist.ts";
import { importBatches } from "../../schema/import-batches.ts";
import { instruments } from "../../schema/instruments.ts";
import { propFirmPrograms, propFirms } from "../../schema/prop-firms.ts";
import { tradingStrategies } from "../../schema/strategies.ts";
import { tradeAccounts, trades } from "../../schema/trades.ts";
import { users } from "../../schema/users.ts";
import {
  applySetupGuideAction,
  getSetupGuide,
  SetupGuideError,
} from "../setup-guide.ts";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface Fixture {
  tx: Tx;
  userId: number;
  otherUserId: number;
  instrumentId: number;
}

// Rolled back like the other query tests: nothing here is ever committed.
async function fixture(body: (f: Fixture) => Promise<void>) {
  try {
    await db.transaction(async (tx) => {
      const [user, other] = await tx
        .insert(users)
        .values([
          {
            username: "setup-guide-test",
            email: "setup-guide-test@users.invalid",
            displayName: "Setup guide test",
            timezone: "Europe/Berlin",
          },
          {
            username: "setup-guide-test-other",
            email: "setup-guide-test-other@users.invalid",
            displayName: "Setup guide other",
            timezone: "Europe/Berlin",
          },
        ])
        .returning({ id: users.id });
      const [instrument] = await tx
        .insert(instruments)
        .values({
          symbol: "TEST-SETUP-GUIDE",
          name: "Setup guide test",
          pointValue: "2",
          tickSize: "0.25",
        })
        .returning({ id: instruments.id });
      await body({
        tx,
        userId: user.id,
        otherUserId: other.id,
        instrumentId: instrument.id,
      });
      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }
}

async function addAccount(
  f: Fixture,
  userId: number,
  options: { isPractice?: boolean; archived?: boolean } = {},
) {
  const [account] = await f.tx
    .insert(accounts)
    .values({
      userId,
      name: "Setup guide account",
      sortOrder: 0,
      isPractice: options.isPractice ?? false,
      archivedAt: options.archived ? new Date("2026-10-01T00:00:00Z") : null,
    })
    .returning({ id: accounts.id });
  return account.id;
}

async function addTrade(
  f: Fixture,
  userId: number,
  options: { taken: boolean; accountId?: number; importBatchId?: number },
) {
  const [trade] = await f.tx
    .insert(trades)
    .values({
      userId,
      tradeDate: "2026-10-01",
      instrumentId: f.instrumentId,
      taken: options.taken,
      entryTime: "09:00",
      direction: "long",
      entryPrice: "100",
      importBatchId: options.importBatchId ?? null,
    })
    .returning({ id: trades.id });
  if (options.accountId !== undefined)
    await f.tx
      .insert(tradeAccounts)
      .values({ tradeId: trade.id, accountId: options.accountId });
}

async function activate(f: Fixture, userId: number) {
  await f.tx
    .update(users)
    .set({ setupGuide: "active" })
    .where(eq(users.id, userId));
}

/** The ticked steps of an active guide. */
async function ticks(f: Fixture, userId: number): Promise<SetupStepKey[]> {
  const view = await getSetupGuide(userId, f.tx);
  if (view.kind !== "steps" && view.kind !== "completion")
    throw new Error(`expected steps, got ${view.kind}`);
  return view.steps.filter((step) => step.done).map((step) => step.key);
}

describe("getSetupGuide facts", () => {
  it("asks a newly registered user", async () => {
    await fixture(async (f) => {
      expect(await getSetupGuide(f.userId, f.tx)).toEqual({ kind: "question" });
    });
  });

  it("counts an active practice account but not an archived one", async () => {
    await fixture(async (f) => {
      await activate(f, f.userId);
      await addAccount(f, f.userId, { archived: true });
      expect(await ticks(f, f.userId)).toEqual([]);
      await addAccount(f, f.userId, { isPractice: true });
      expect(await ticks(f, f.userId)).toEqual(["account"]);
    });
  });

  it("counts a missed setup, a taken trade and an imported trade as an entry", async () => {
    await fixture(async (f) => {
      await activate(f, f.userId);
      await addTrade(f, f.userId, { taken: false });
      expect(await ticks(f, f.userId)).toEqual(["entry"]);
    });
    await fixture(async (f) => {
      await activate(f, f.userId);
      const accountId = await addAccount(f, f.userId, { archived: true });
      await addTrade(f, f.userId, { taken: true, accountId });
      expect(await ticks(f, f.userId)).toEqual(["entry"]);
    });
    await fixture(async (f) => {
      await activate(f, f.userId);
      const accountId = await addAccount(f, f.userId, { archived: true });
      const [batch] = await f.tx
        .insert(importBatches)
        .values({
          userId: f.userId,
          accountId,
          filename: "setup-guide-test.csv",
          rowCount: 1,
          detectedShape: "fills",
        })
        .returning({ id: importBatches.id });
      await addTrade(f, f.userId, {
        taken: true,
        accountId,
        importBatchId: batch.id,
      });
      expect(await ticks(f, f.userId)).toEqual(["entry"]);
    });
  });

  it("ticks the optional steps from a linked account, a strategy and a checklist step", async () => {
    await fixture(async (f) => {
      await activate(f, f.userId);
      const accountId = await addAccount(f, f.userId);
      const [firm] = await f.tx
        .insert(propFirms)
        .values({ name: "Setup guide test firm" })
        .returning({ id: propFirms.id });
      const [program] = await f.tx
        .insert(propFirmPrograms)
        .values({ firmId: firm.id, name: "50k Static" })
        .returning({ id: propFirmPrograms.id });
      await f.tx.insert(accountRules).values({
        accountId,
        programId: program.id,
        evaluationStart: "2026-10-01",
        profitTarget: "3000.00",
        drawdownAmount: "2000.00",
        drawdownType: "static",
      });
      expect(await ticks(f, f.userId)).toEqual(["account", "propFirm"]);
      await f.tx.insert(tradingStrategies).values({ userId: f.userId });
      expect(await ticks(f, f.userId)).toEqual([
        "account",
        "propFirm",
        "strategy",
      ]);
      await f.tx.insert(checklistTemplateItems).values({
        userId: f.userId,
        phase: "premarket",
        text: "Read the news",
        position: 0,
      });
      expect(await ticks(f, f.userId)).toEqual([
        "account",
        "propFirm",
        "strategy",
        "checklist",
      ]);
    });
  });

  it("ignores an archived strategy and a link on an archived account", async () => {
    await fixture(async (f) => {
      await activate(f, f.userId);
      const accountId = await addAccount(f, f.userId, { archived: true });
      const [firm] = await f.tx
        .insert(propFirms)
        .values({ name: "Setup guide test firm" })
        .returning({ id: propFirms.id });
      const [program] = await f.tx
        .insert(propFirmPrograms)
        .values({ firmId: firm.id, name: "50k Static" })
        .returning({ id: propFirmPrograms.id });
      await f.tx.insert(accountRules).values({
        accountId,
        programId: program.id,
        evaluationStart: "2026-10-01",
        profitTarget: "3000.00",
        drawdownAmount: "2000.00",
        drawdownType: "static",
      });
      await f.tx
        .insert(tradingStrategies)
        .values({ userId: f.userId, archivedAt: new Date("2026-10-01") });
      expect(await ticks(f, f.userId)).toEqual([]);
    });
  });

  it("never asks a user who already has an account and an entry", async () => {
    await fixture(async (f) => {
      const accountId = await addAccount(f, f.userId);
      await addTrade(f, f.userId, { taken: true, accountId });
      expect(await getSetupGuide(f.userId, f.tx)).toEqual({
        kind: "hidden",
        offerSwitch: false,
      });
    });
  });

  it("reads only the user's own data", async () => {
    await fixture(async (f) => {
      await activate(f, f.userId);
      const accountId = await addAccount(f, f.otherUserId);
      await addTrade(f, f.otherUserId, { taken: true, accountId });
      await f.tx.insert(tradingStrategies).values({ userId: f.otherUserId });
      await f.tx.insert(checklistTemplateItems).values({
        userId: f.otherUserId,
        phase: "review",
        text: "Journal",
        position: 0,
      });
      expect(await ticks(f, f.userId)).toEqual([]);
      expect(await getSetupGuide(f.otherUserId, f.tx)).toEqual({
        kind: "hidden",
        offerSwitch: false,
      });
    });
  });
});

describe("applySetupGuideAction", () => {
  it("shows the steps after yes", async () => {
    await fixture(async (f) => {
      await applySetupGuideAction(f.userId, "accept", f.tx);
      expect(await getSetupGuide(f.userId, f.tx)).toEqual(
        expect.objectContaining({ kind: "steps", canHide: false }),
      );
    });
  });

  it("hides the card after no and leaves the switch for Settings", async () => {
    await fixture(async (f) => {
      await applySetupGuideAction(f.userId, "decline", f.tx);
      expect(await getSetupGuide(f.userId, f.tx)).toEqual({
        kind: "hidden",
        offerSwitch: true,
      });
    });
  });

  it("refuses a second answer", async () => {
    await fixture(async (f) => {
      await applySetupGuideAction(f.userId, "decline", f.tx);
      await expect(
        applySetupGuideAction(f.userId, "accept", f.tx),
      ).rejects.toThrow(SetupGuideError);
      expect(await getSetupGuide(f.userId, f.tx)).toEqual({
        kind: "hidden",
        offerSwitch: true,
      });
    });
  });

  it("refuses an answer from a user who is never asked", async () => {
    await fixture(async (f) => {
      const accountId = await addAccount(f, f.userId);
      await addTrade(f, f.userId, { taken: false, accountId });
      await expect(
        applySetupGuideAction(f.userId, "accept", f.tx),
      ).rejects.toThrow(SetupGuideError);
    });
  });

  it("refuses any answer from the demo user", async () => {
    await fixture(async (f) => {
      // A demo user without data, so only the demo rule can refuse. The
      // seeded one, if present, steps aside until the rollback.
      await f.tx
        .update(users)
        .set({ username: "setup-guide-test-seeded-demo" })
        .where(eq(users.username, DEMO_USERNAME));
      const [demo] = await f.tx
        .insert(users)
        .values({
          username: DEMO_USERNAME,
          email: "setup-guide-test-demo@users.invalid",
          displayName: "Demo",
          timezone: "Europe/Berlin",
        })
        .returning({ id: users.id });
      const demoId = demo.id;
      for (const action of ["accept", "decline", "hide", "show"] as const)
        await expect(
          applySetupGuideAction(demoId, action, f.tx),
        ).rejects.toThrow(SetupGuideError);
    });
  });

  it("changes only the answering user's guide", async () => {
    await fixture(async (f) => {
      await applySetupGuideAction(f.userId, "decline", f.tx);
      expect(await getSetupGuide(f.otherUserId, f.tx)).toEqual({
        kind: "question",
      });
    });
  });

  it("goes with the user when the user is deleted", async () => {
    await fixture(async (f) => {
      await applySetupGuideAction(f.userId, "accept", f.tx);
      await f.tx.delete(users).where(eq(users.id, f.userId));
      await expect(getSetupGuide(f.userId, f.tx)).rejects.toThrow(
        "no such user",
      );
      expect(await getSetupGuide(f.otherUserId, f.tx)).toEqual({
        kind: "question",
      });
    });
  });
});

describe("hiding and showing the guide", () => {
  it("refuses to hide the guide before an account exists", async () => {
    await fixture(async (f) => {
      await applySetupGuideAction(f.userId, "accept", f.tx);
      await addTrade(f, f.userId, { taken: false });
      await expect(
        applySetupGuideAction(f.userId, "hide", f.tx),
      ).rejects.toThrow(SetupGuideError);
      expect(await getSetupGuide(f.userId, f.tx)).toEqual(
        expect.objectContaining({ kind: "steps", canHide: false }),
      );
    });
  });

  it("hides the guide once an account exists and offers the switch", async () => {
    await fixture(async (f) => {
      await applySetupGuideAction(f.userId, "accept", f.tx);
      await addAccount(f, f.userId, { isPractice: true });
      await applySetupGuideAction(f.userId, "hide", f.tx);
      expect(await getSetupGuide(f.userId, f.tx)).toEqual({
        kind: "hidden",
        offerSwitch: true,
      });
    });
  });

  it("shows the steps again after the switch, from declined or dismissed", async () => {
    await fixture(async (f) => {
      await applySetupGuideAction(f.userId, "decline", f.tx);
      await applySetupGuideAction(f.userId, "show", f.tx);
      expect(await getSetupGuide(f.userId, f.tx)).toEqual(
        expect.objectContaining({ kind: "steps" }),
      );
      await addAccount(f, f.userId);
      await applySetupGuideAction(f.userId, "hide", f.tx);
      await applySetupGuideAction(f.userId, "show", f.tx);
      expect(await getSetupGuide(f.userId, f.tx)).toEqual(
        expect.objectContaining({ kind: "steps", canHide: true }),
      );
    });
  });

  it("refuses the switch once both required steps are done, after a hide too", async () => {
    await fixture(async (f) => {
      await applySetupGuideAction(f.userId, "accept", f.tx);
      await addAccount(f, f.userId);
      await applySetupGuideAction(f.userId, "hide", f.tx);
      await addTrade(f, f.userId, { taken: false });
      await expect(
        applySetupGuideAction(f.userId, "show", f.tx),
      ).rejects.toThrow(SetupGuideError);
    });
  });

  it("refuses the switch once both required steps are done", async () => {
    await fixture(async (f) => {
      await applySetupGuideAction(f.userId, "decline", f.tx);
      const accountId = await addAccount(f, f.userId);
      await addTrade(f, f.userId, { taken: true, accountId });
      await expect(
        applySetupGuideAction(f.userId, "show", f.tx),
      ).rejects.toThrow(SetupGuideError);
      expect(await getSetupGuide(f.userId, f.tx)).toEqual({
        kind: "hidden",
        offerSwitch: false,
      });
    });
  });

  it("refuses the switch in state completed", async () => {
    await fixture(async (f) => {
      await f.tx
        .update(users)
        .set({ setupGuide: "completed" })
        .where(eq(users.id, f.userId));
      await expect(
        applySetupGuideAction(f.userId, "show", f.tx),
      ).rejects.toThrow(SetupGuideError);
    });
  });

  it("hides only the acting user's guide", async () => {
    await fixture(async (f) => {
      for (const userId of [f.userId, f.otherUserId]) {
        await applySetupGuideAction(userId, "accept", f.tx);
        await addAccount(f, userId);
      }
      await applySetupGuideAction(f.userId, "hide", f.tx);
      expect(await getSetupGuide(f.otherUserId, f.tx)).toEqual(
        expect.objectContaining({ kind: "steps", canHide: true }),
      );
    });
  });
});

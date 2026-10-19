import { eq, TransactionRollbackError } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { db } from "../../index.ts";
import { accountRules } from "../../schema/account-rules.ts";
import { accountCommissionRates, accounts } from "../../schema/accounts.ts";
import { instruments } from "../../schema/instruments.ts";
import { ledgerEntries } from "../../schema/ledger.ts";
import { propFirmPrograms, propFirms } from "../../schema/prop-firms.ts";
import { tradeAccounts, trades } from "../../schema/trades.ts";
import { users } from "../../schema/users.ts";
import { type AccountDraftWrite, saveAccountDraft } from "../account-editor.ts";
import { type AccountRulesWrite, listAccountRules } from "../account-rules.ts";
import {
  deleteUnusedAccount,
  listAllAccountsForSettings,
} from "../accounts.ts";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
async function fixture(
  body: (
    tx: Tx,
    userId: number,
    instrumentId: number,
    programId: number,
  ) => Promise<void>,
) {
  try {
    await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          username: "account-editor-test",
          email: "account-editor-test@users.invalid",
          displayName: "Account editor test",
          timezone: "Europe/Berlin",
        })
        .returning();
      const [instrument] = await tx
        .insert(instruments)
        .values({
          symbol: "TEST-ACCOUNT-EDITOR",
          name: "Account editor test",
          pointValue: "2",
          tickSize: "0.25",
        })
        .returning();
      const [firm] = await tx
        .insert(propFirms)
        .values({ name: "Account editor test firm" })
        .returning();
      const [program] = await tx
        .insert(propFirmPrograms)
        .values({
          firmId: firm.id,
          name: "50k EOD",
          maxDrawdown: "$2,000 (EOD)",
        })
        .returning();
      await body(tx, user.id, instrument.id, program.id);
      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }
}
const draft: AccountDraftWrite = {
  name: "Evaluation",
  isPractice: false,
  currency: "USD",
  balanceCents: 5_000_000,
  commissionRates: [],
  rules: null,
};
const rules = (programId: number): AccountRulesWrite => ({
  programId,
  evaluationStart: "2026-10-01",
  profitTargetCents: 300_000,
  drawdownAmountCents: 200_000,
  drawdownType: "eod_trailing",
  lockLevelCents: 5_010_000,
  dailyLossLimitCents: 100_000,
  consistencyPercent: 50,
  minTradingDays: 5,
});
const usd = async (amountCents: number) => ({
  amountCents,
  usdCents: amountCents,
  rateDate: null,
});

async function read(tx: Tx, id: number) {
  const [account] = await tx.select().from(accounts).where(eq(accounts.id, id));
  const rates = await tx
    .select()
    .from(accountCommissionRates)
    .where(eq(accountCommissionRates.accountId, id));
  return { account, rates };
}

describe("saveAccountDraft", () => {
  it("creates and edits all fields and commission rates together", async () => {
    await fixture(async (tx, userId, instrumentId) => {
      const { id } = await saveAccountDraft(
        userId,
        { ...draft, commissionRates: [{ instrumentId, perSideCents: 125 }] },
        usd,
        tx,
      );
      expect((await read(tx, id)).rates[0].perSide).toBe("1.25");
      await saveAccountDraft(
        userId,
        {
          ...draft,
          accountId: id,
          name: "Practice",
          isPractice: true,
          balanceCents: 250_000,
          commissionRates: [{ instrumentId, perSideCents: 70 }],
        },
        usd,
        tx,
      );
      const saved = await read(tx, id);
      expect(saved.account).toMatchObject({
        name: "Practice",
        isPractice: true,
        startingBalance: "2500.00",
        startingBalanceUsd: "2500.00",
        isDefaultForNewTrades: false,
      });
      expect(saved.rates).toHaveLength(1);
      expect(saved.rates[0].perSide).toBe("0.70");
      await saveAccountDraft(userId, { ...draft, accountId: id }, usd, tx);
      expect((await read(tx, id)).rates).toEqual([]);
    });
  });

  it("preserves the historic EUR conversion when only name, practice or rates change", async () => {
    await fixture(async (tx, userId, instrumentId) => {
      const resolve = vi.fn(async (amountCents: number) => ({
        amountCents,
        usdCents: 5_700_000,
        rateDate: "2026-09-18",
      }));
      const { id } = await saveAccountDraft(
        userId,
        { ...draft, currency: "EUR" },
        resolve,
        tx,
      );
      resolve.mockClear();
      await saveAccountDraft(
        userId,
        {
          ...draft,
          accountId: id,
          currency: "EUR",
          name: "Renamed",
          isPractice: true,
          commissionRates: [{ instrumentId, perSideCents: 50 }],
        },
        resolve,
        tx,
      );
      expect(resolve).not.toHaveBeenCalled();
      expect((await read(tx, id)).account).toMatchObject({
        startingBalance: "50000.00",
        startingBalanceUsd: "57000.00",
        startingBalanceRateDate: "2026-09-18",
      });
    });
  });

  it("recalculates a changed balance or currency exactly once", async () => {
    await fixture(async (tx, userId) => {
      const { id } = await saveAccountDraft(userId, draft, usd, tx);
      const resolve = vi.fn(async (amountCents: number) => ({
        amountCents,
        usdCents: 1_140_000,
        rateDate: "2026-09-18",
      }));
      await saveAccountDraft(
        userId,
        { ...draft, accountId: id, currency: "EUR", balanceCents: 1_000_000 },
        resolve,
        tx,
      );
      expect(resolve).toHaveBeenCalledExactlyOnceWith(1_000_000, "EUR");
      expect((await read(tx, id)).account.startingBalanceUsd).toBe("11400.00");
    });
  });

  it("rolls back both account edits and rates when an instrument is invalid", async () => {
    await fixture(async (tx, userId, instrumentId) => {
      const original = {
        ...draft,
        commissionRates: [{ instrumentId, perSideCents: 50 }],
      };
      const { id } = await saveAccountDraft(userId, original, usd, tx);
      const before = await read(tx, id);
      await expect(
        saveAccountDraft(
          userId,
          {
            ...draft,
            accountId: id,
            name: "Must not persist",
            commissionRates: [{ instrumentId: -1, perSideCents: 100 }],
          },
          usd,
          tx,
        ),
      ).rejects.toThrow("instrument");
      expect(await read(tx, id)).toEqual(before);
      await expect(
        saveAccountDraft(
          userId,
          {
            ...draft,
            name: "Failed create",
            commissionRates: [{ instrumentId: -1, perSideCents: 100 }],
          },
          usd,
          tx,
        ),
      ).rejects.toThrow("instrument");
      expect(
        await tx.select().from(accounts).where(eq(accounts.userId, userId)),
      ).toHaveLength(1);
    });
  });

  it("rolls back changes on a database constraint failure after rate replacement", async () => {
    await fixture(async (tx, userId, instrumentId) => {
      const { id } = await saveAccountDraft(
        userId,
        { ...draft, commissionRates: [{ instrumentId, perSideCents: 50 }] },
        usd,
        tx,
      );
      const before = await read(tx, id);
      await expect(
        saveAccountDraft(
          userId,
          {
            ...draft,
            accountId: id,
            name: "Must roll back",
            commissionRates: [{ instrumentId, perSideCents: -1 }],
          },
          usd,
          tx,
        ),
      ).rejects.toThrow();
      expect(await read(tx, id)).toEqual(before);
    });
  });

  it("rejects foreign and archived accounts", async () => {
    await fixture(async (tx, userId) => {
      const { id } = await saveAccountDraft(userId, draft, usd, tx);
      const before = await read(tx, id);
      await expect(
        saveAccountDraft(
          userId + 1,
          { ...draft, accountId: id, name: "Foreign" },
          usd,
          tx,
        ),
      ).rejects.toThrow("Account not found");
      expect(await read(tx, id)).toEqual(before);
      await tx
        .update(accounts)
        .set({ archivedAt: new Date() })
        .where(eq(accounts.id, id));
      await expect(
        saveAccountDraft(userId, { ...draft, accountId: id }, usd, tx),
      ).rejects.toThrow("archived");
    });
  });

  it("leaves every field untouched if the FX resolver fails", async () => {
    await fixture(async (tx, userId, instrumentId) => {
      const { id } = await saveAccountDraft(userId, draft, usd, tx);
      const before = await read(tx, id);
      await expect(
        saveAccountDraft(
          userId,
          {
            ...draft,
            accountId: id,
            currency: "EUR",
            name: "Failed FX",
            commissionRates: [{ instrumentId, perSideCents: 50 }],
          },
          async () => {
            throw new Error("FX unavailable");
          },
          tx,
        ),
      ).rejects.toThrow("FX unavailable");
      expect(await read(tx, id)).toEqual(before);
    });
  });

  it("locks currency with trades, permits other edits and never rewrites trade commissions", async () => {
    await fixture(async (tx, userId, instrumentId) => {
      const { id } = await saveAccountDraft(userId, draft, usd, tx);
      const [trade] = await tx
        .insert(trades)
        .values({
          userId,
          instrumentId,
          tradeDate: "2026-09-01",
          taken: true,
          contracts: "1",
          entryTime: "09:31:00",
          direction: "long",
          entryPrice: "100.0000",
        })
        .returning();
      await tx.insert(tradeAccounts).values({
        tradeId: trade.id,
        accountId: id,
        commission: "2.50",
        commissionSource: "manual",
      });
      const before = await read(tx, id);
      await expect(
        saveAccountDraft(
          userId,
          { ...draft, accountId: id, currency: "EUR", name: "Locked" },
          usd,
          tx,
        ),
      ).rejects.toThrow("currency can no longer change");
      expect(await read(tx, id)).toEqual(before);
      await saveAccountDraft(
        userId,
        {
          ...draft,
          accountId: id,
          name: "Allowed",
          commissionRates: [{ instrumentId, perSideCents: 100 }],
        },
        usd,
        tx,
      );
      const [assignment] = await tx
        .select()
        .from(tradeAccounts)
        .where(eq(tradeAccounts.tradeId, trade.id));
      expect(assignment.commission).toBe("2.50");
      expect(assignment.commissionSource).toBe("manual");
      expect((await read(tx, id)).account.name).toBe("Allowed");
    });
  });

  it("refuses practice for an account with ledger entries, allows it without", async () => {
    await fixture(async (tx, userId) => {
      const withEntry = await saveAccountDraft(
        userId,
        { ...draft, name: "With entry" },
        usd,
        tx,
      );
      const without = await saveAccountDraft(
        userId,
        { ...draft, name: "Without entry" },
        usd,
        tx,
      );
      await tx.insert(ledgerEntries).values({
        userId,
        accountId: withEntry.id,
        entryDate: "2026-09-01",
        kind: "expense",
        category: "evaluation",
        amount: "150.00",
      });
      const before = await read(tx, withEntry.id);
      await expect(
        saveAccountDraft(
          userId,
          { ...draft, accountId: withEntry.id, isPractice: true },
          usd,
          tx,
        ),
      ).rejects.toThrow("can't become a practice account");
      expect(await read(tx, withEntry.id)).toEqual(before);

      await saveAccountDraft(
        userId,
        { ...draft, accountId: without.id, isPractice: true },
        usd,
        tx,
      );
      expect((await read(tx, without.id)).account.isPractice).toBe(true);
    });
  });

  it("still saves a practice account that already has a ledger entry", async () => {
    await fixture(async (tx, userId) => {
      // Not reachable through the app; pins that the lock is on the switch,
      // so such an account is never stuck.
      const { id } = await saveAccountDraft(
        userId,
        { ...draft, isPractice: true },
        usd,
        tx,
      );
      await tx.insert(ledgerEntries).values({
        userId,
        accountId: id,
        entryDate: "2026-09-01",
        kind: "payout",
        amount: "100.00",
      });
      await saveAccountDraft(
        userId,
        { ...draft, accountId: id, isPractice: true, name: "Renamed" },
        usd,
        tx,
      );
      expect((await read(tx, id)).account.name).toBe("Renamed");
      await saveAccountDraft(userId, { ...draft, accountId: id }, usd, tx);
      expect((await read(tx, id)).account.isPractice).toBe(false);
    });
  });
});

it("reports the currency lock for the account that actually owns the trade", async () => {
  await fixture(async (tx, userId, instrumentId) => {
    const empty = await saveAccountDraft(
      userId,
      { ...draft, name: "No trades" },
      usd,
      tx,
    );
    const assigned = await saveAccountDraft(
      userId,
      { ...draft, name: "With trades" },
      usd,
      tx,
    );
    const [trade] = await tx
      .insert(trades)
      .values({
        userId,
        instrumentId,
        tradeDate: "2026-09-01",
        taken: true,
        contracts: "1",
        entryTime: "09:31:00",
        direction: "long",
        entryPrice: "100.0000",
      })
      .returning();
    await tx
      .insert(tradeAccounts)
      .values({ tradeId: trade.id, accountId: assigned.id });
    const rows = await listAllAccountsForSettings(userId, tx);
    expect(rows.find((row) => row.id === assigned.id)?.hasTrades).toBe(true);
    expect(rows.find((row) => row.id === empty.id)?.hasTrades).toBe(false);
    expect(await listAllAccountsForSettings(userId + 1, tx)).toEqual([]);
  });
});

it("refuses to delete an account for good while a trade is assigned", async () => {
  await fixture(async (tx, userId, instrumentId) => {
    const { id } = await saveAccountDraft(userId, draft, usd, tx);
    const [trade] = await tx
      .insert(trades)
      .values({
        userId,
        instrumentId,
        tradeDate: "2026-09-01",
        taken: true,
        contracts: "1",
        entryTime: "09:31:00",
        direction: "long",
        entryPrice: "100.0000",
      })
      .returning();
    await tx.insert(tradeAccounts).values({ tradeId: trade.id, accountId: id });

    expect(await deleteUnusedAccount(userId, id, tx)).toBe("in-use");
  });
});

describe("saveAccountDraft with a prop firm program link", () => {
  async function readRules(tx: Tx, id: number) {
    return tx.select().from(accountRules).where(eq(accountRules.accountId, id));
  }

  it("links, edits and removes the link together with the account", async () => {
    await fixture(async (tx, userId, _instrumentId, programId) => {
      const { id } = await saveAccountDraft(
        userId,
        { ...draft, rules: rules(programId) },
        usd,
        tx,
      );
      expect(await readRules(tx, id)).toEqual([
        expect.objectContaining({
          programId,
          evaluationStart: "2026-10-01",
          profitTarget: "3000.00",
          drawdownAmount: "2000.00",
          drawdownType: "eod_trailing",
          lockLevel: "50100.00",
          dailyLossLimit: "1000.00",
          consistencyPercent: 50,
          minTradingDays: 5,
        }),
      ]);

      await saveAccountDraft(
        userId,
        {
          ...draft,
          accountId: id,
          rules: {
            ...rules(programId),
            drawdownType: "static",
            lockLevelCents: null,
            dailyLossLimitCents: null,
            consistencyPercent: null,
            minTradingDays: null,
          },
        },
        usd,
        tx,
      );
      expect(await readRules(tx, id)).toEqual([
        expect.objectContaining({
          drawdownType: "static",
          lockLevel: null,
          dailyLossLimit: null,
          consistencyPercent: null,
          minTradingDays: null,
        }),
      ]);

      await saveAccountDraft(userId, { ...draft, accountId: id }, usd, tx);
      expect(await readRules(tx, id)).toEqual([]);
      expect((await read(tx, id)).account.name).toBe("Evaluation");
    });
  });

  it("refuses to link a practice account", async () => {
    await fixture(async (tx, userId, _instrumentId, programId) => {
      await expect(
        saveAccountDraft(
          userId,
          { ...draft, isPractice: true, rules: rules(programId) },
          usd,
          tx,
        ),
      ).rejects.toThrow("Practice accounts can't be linked");
      expect(
        await tx.select().from(accounts).where(eq(accounts.userId, userId)),
      ).toEqual([]);
    });
  });

  it("refuses to switch a linked account to practice", async () => {
    await fixture(async (tx, userId, _instrumentId, programId) => {
      const { id } = await saveAccountDraft(
        userId,
        { ...draft, rules: rules(programId) },
        usd,
        tx,
      );
      const before = await read(tx, id);
      await expect(
        saveAccountDraft(
          userId,
          {
            ...draft,
            accountId: id,
            isPractice: true,
            rules: rules(programId),
          },
          usd,
          tx,
        ),
      ).rejects.toThrow("Remove the link to make it a practice account");
      expect(await read(tx, id)).toEqual(before);
      expect(await readRules(tx, id)).toHaveLength(1);

      // Removing the link in the same save is not a linked account turning
      // practice: the account leaves every rule at once.
      await saveAccountDraft(
        userId,
        { ...draft, accountId: id, isPractice: true },
        usd,
        tx,
      );
      expect(await readRules(tx, id)).toEqual([]);
    });
  });

  it("refuses to link an account without a starting balance", async () => {
    await fixture(async (tx, userId, _instrumentId, programId) => {
      const { id } = await saveAccountDraft(
        userId,
        { ...draft, balanceCents: 0 },
        usd,
        tx,
      );
      await expect(
        saveAccountDraft(
          userId,
          { ...draft, accountId: id, balanceCents: 0, rules: rules(programId) },
          usd,
          tx,
        ),
      ).rejects.toThrow("Enter a starting balance");
      expect(await readRules(tx, id)).toEqual([]);

      // A balance entered in the same save is enough.
      await saveAccountDraft(
        userId,
        { ...draft, accountId: id, rules: rules(programId) },
        usd,
        tx,
      );
      expect(await readRules(tx, id)).toHaveLength(1);
    });
  });

  it("refuses another user's account, an unknown program and a misplaced lock level", async () => {
    await fixture(async (tx, userId, _instrumentId, programId) => {
      const { id } = await saveAccountDraft(userId, draft, usd, tx);
      await expect(
        saveAccountDraft(
          userId + 1,
          { ...draft, accountId: id, rules: rules(programId) },
          usd,
          tx,
        ),
      ).rejects.toThrow("Account not found");
      await expect(
        saveAccountDraft(
          userId,
          { ...draft, accountId: id, rules: rules(-1) },
          usd,
          tx,
        ),
      ).rejects.toThrow("Pick a prop firm program");
      await expect(
        saveAccountDraft(
          userId,
          {
            ...draft,
            accountId: id,
            rules: { ...rules(programId), drawdownType: "static" },
          },
          usd,
          tx,
        ),
      ).rejects.toThrow("A lock level only applies");
      expect(await readRules(tx, id)).toEqual([]);
    });
  });

  it("lists links with firm and program for the current user only", async () => {
    await fixture(async (tx, userId, _instrumentId, programId) => {
      const { id } = await saveAccountDraft(
        userId,
        { ...draft, rules: rules(programId) },
        usd,
        tx,
      );
      await saveAccountDraft(userId, { ...draft, name: "Unlinked" }, usd, tx);
      expect(await listAccountRules(userId, tx)).toEqual([
        expect.objectContaining({
          accountId: id,
          programId,
          firmName: "Account editor test firm",
          programName: "50k EOD",
          profitTargetCents: 300_000,
          lockLevelCents: 5_010_000,
          drawdownType: "eod_trailing",
        }),
      ]);
      expect(await listAccountRules(userId + 1, tx)).toEqual([]);
    });
  });
});

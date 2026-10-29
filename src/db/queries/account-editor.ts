import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import {
  ACCOUNT_RULES_MESSAGES,
  checkLinkable,
  validateAccountRules,
} from "../../domain/account-rules.ts";
import { amountToCents } from "../../domain/commission.ts";
import type { AccountCurrency } from "../../domain/fx.ts";
import { type MessageValues, messageKey } from "../../lib/i18n/message-keys.ts";
import { formatCentsPlain } from "../../lib/money.ts";
import { db } from "../index.ts";
import { accountRules } from "../schema/account-rules.ts";
import { accountCommissionRates, accounts } from "../schema/accounts.ts";
import { instruments } from "../schema/instruments.ts";
import { propFirmPrograms } from "../schema/prop-firms.ts";
import type { AccountRulesWrite } from "./account-rules.ts";
import {
  getNextSortOrder,
  hasAssignedTrades,
  hasLedgerEntries,
  type StartingBalanceValues,
} from "./accounts.ts";

export class AccountSaveError extends Error {
  /** `message` is a message key; `values` are the ones it names (message-keys.ts). */
  constructor(
    message: string,
    readonly values?: MessageValues,
  ) {
    super(message);
  }
}

export interface AccountDraftWrite {
  accountId?: number;
  name: string;
  isPractice: boolean;
  currency: AccountCurrency;
  balanceCents: number;
  commissionRates: { instrumentId: number; perSideCents: number }[];
  /** The prop firm program link; null means not linked (any link is removed). */
  rules: AccountRulesWrite | null;
}

type BalanceResolver = (
  cents: number,
  currency: AccountCurrency,
) => Promise<StartingBalanceValues>;

/** All account fields, rates and the program link commit together. The resolver is only called when
 * the amount or currency changes, preserving the historical USD conversion. */
export async function saveAccountDraft(
  userId: number,
  draft: AccountDraftWrite,
  resolveBalance: BalanceResolver,
  executor: Pick<typeof db, "transaction"> = db,
): Promise<{ id: number }> {
  return executor.transaction(async (tx) => {
    const [current] =
      draft.accountId === undefined
        ? []
        : await tx
            .select()
            .from(accounts)
            .where(
              and(
                eq(accounts.id, draft.accountId),
                eq(accounts.userId, userId),
                isNull(accounts.archivedAt),
              ),
            )
            .for("update");
    if (draft.accountId !== undefined && !current) {
      throw new AccountSaveError(
        messageKey("errors.accountNotFoundOrArchived"),
      );
    }

    const amount = formatCentsPlain(draft.balanceCents);
    const balanceChanged =
      !current ||
      current.currency !== draft.currency ||
      current.startingBalance !== amount;
    const balance = balanceChanged
      ? await resolveBalance(draft.balanceCents, draft.currency)
      : undefined;
    const values = {
      name: draft.name,
      isPractice: draft.isPractice,
      currency: draft.currency,
      ...(balance
        ? {
            startingBalance: formatCentsPlain(balance.amountCents),
            startingBalanceUsd: formatCentsPlain(balance.usdCents),
            startingBalanceRateDate: balance.rateDate,
          }
        : {}),
    };

    let saved: { id: number };
    if (current) {
      const [updated] = await tx
        .update(accounts)
        .set(values)
        .where(
          and(
            eq(accounts.id, current.id),
            eq(accounts.userId, userId),
            isNull(accounts.archivedAt),
            or(
              eq(accounts.currency, draft.currency),
              sql`not ${hasAssignedTrades()}`,
            ),
            // Ledger money belongs to real accounts only (docs/adr/0002):
            // the switch to practice is refused, staying practice is not.
            draft.isPractice
              ? or(
                  eq(accounts.isPractice, true),
                  sql`not ${hasLedgerEntries()}`,
                )
              : undefined,
          ),
        )
        .returning({ id: accounts.id });
      if (!updated) {
        // The update refused one of the locks; name the one that applies.
        const [locks] = await tx
          .select({
            hasTrades: hasAssignedTrades().mapWith(Boolean),
            hasLedgerEntries: hasLedgerEntries().mapWith(Boolean),
          })
          .from(accounts)
          .where(and(eq(accounts.id, current.id), eq(accounts.userId, userId)));
        if (locks?.hasTrades && current.currency !== draft.currency)
          throw new AccountSaveError(
            messageKey("errors.accountCurrencyLocked"),
          );
        if (locks?.hasLedgerEntries && draft.isPractice && !current.isPractice)
          throw new AccountSaveError(
            messageKey("errors.accountPracticeLocked"),
          );
        throw new AccountSaveError(
          messageKey("errors.accountNotFoundOrArchived"),
        );
      }
      saved = updated;
    } else {
      [saved] = await tx
        .insert(accounts)
        .values({
          ...values,
          userId,
          sortOrder: await getNextSortOrder(userId, tx),
        })
        .returning({ id: accounts.id });
    }

    const instrumentIds = draft.commissionRates.map(
      (rate) => rate.instrumentId,
    );
    if (instrumentIds.length) {
      const found = await tx
        .select({ id: instruments.id })
        .from(instruments)
        .where(inArray(instruments.id, instrumentIds));
      if (found.length !== instrumentIds.length)
        throw new AccountSaveError(messageKey("validation.pickRateInstrument"));
    }
    await tx
      .delete(accountCommissionRates)
      .where(eq(accountCommissionRates.accountId, saved.id));
    if (draft.commissionRates.length) {
      await tx.insert(accountCommissionRates).values(
        draft.commissionRates.map((rate) => ({
          accountId: saved.id,
          instrumentId: rate.instrumentId,
          perSide: formatCentsPlain(rate.perSideCents),
        })),
      );
    }
    await saveAccountRules(
      tx,
      saved.id,
      draft,
      balance
        ? balance.usdCents
        : amountToCents(current?.startingBalanceUsd ?? "0"),
    );
    return saved;
  });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Writes or removes the account's one link, against the account as this save
 * leaves it: a practice account or one without a starting balance carries no
 * link (decided 2026-10-18, prop-firm-link). Checked here, inside the
 * transaction that holds the account row, so no other save can slip between
 * the check and the write.
 */
async function saveAccountRules(
  tx: Tx,
  accountId: number,
  draft: AccountDraftWrite,
  startingBalanceUsdCents: number,
) {
  const rules = draft.rules;
  if (!rules) {
    await tx.delete(accountRules).where(eq(accountRules.accountId, accountId));
    return;
  }
  if (draft.isPractice) {
    // A linked account turning practice hears how to get there.
    const [linked] = await tx
      .select({ accountId: accountRules.accountId })
      .from(accountRules)
      .where(eq(accountRules.accountId, accountId));
    if (linked)
      throw new AccountSaveError(ACCOUNT_RULES_MESSAGES.practiceLinked);
  }
  const linkable = checkLinkable({
    isPractice: draft.isPractice,
    startingBalanceUsdCents,
  });
  if (!linkable.success) throw new AccountSaveError(linkable.error);
  const valid = validateAccountRules(rules);
  if (!valid.success) throw new AccountSaveError(valid.error);
  const [program] = await tx
    .select({ id: propFirmPrograms.id })
    .from(propFirmPrograms)
    .where(eq(propFirmPrograms.id, rules.programId));
  if (!program)
    throw new AccountSaveError(messageKey("validation.pickProgram"));

  const cents = (value: number | null) =>
    value === null ? null : formatCentsPlain(value);
  const values = {
    programId: rules.programId,
    evaluationStart: rules.evaluationStart,
    profitTarget: formatCentsPlain(rules.profitTargetCents),
    drawdownAmount: formatCentsPlain(rules.drawdownAmountCents),
    drawdownType: rules.drawdownType,
    lockLevel: cents(rules.lockLevelCents),
    dailyLossLimit: cents(rules.dailyLossLimitCents),
    consistencyPercent: rules.consistencyPercent,
    minTradingDays: rules.minTradingDays,
  };
  await tx
    .insert(accountRules)
    .values({ accountId, ...values })
    .onConflictDoUpdate({
      target: accountRules.accountId,
      set: { ...values, updatedAt: new Date() },
    });
}

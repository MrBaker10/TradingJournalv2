import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { AccountCurrency } from "../../domain/fx.ts";
import { formatCentsPlain } from "../../lib/money.ts";
import { db } from "../index.ts";
import { accountCommissionRates, accounts } from "../schema/accounts.ts";
import { instruments } from "../schema/instruments.ts";
import {
  getNextSortOrder,
  hasAssignedTrades,
  type StartingBalanceValues,
} from "./accounts.ts";

export class AccountSaveError extends Error {}

export interface AccountDraftWrite {
  accountId?: number;
  name: string;
  isPractice: boolean;
  currency: AccountCurrency;
  balanceCents: number;
  commissionRates: { instrumentId: number; perSideCents: number }[];
}

type BalanceResolver = (
  cents: number,
  currency: AccountCurrency,
) => Promise<StartingBalanceValues>;

/** All account fields and rates commit together. The resolver is only called when
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
      throw new AccountSaveError("Account not found or archived");
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
          ),
        )
        .returning({ id: accounts.id });
      if (!updated)
        throw new AccountSaveError(
          "This account has trades. Its currency can no longer change.",
        );
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
        throw new AccountSaveError(
          "Pick a different instrument for each commission rate",
        );
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
    return saved;
  });
}

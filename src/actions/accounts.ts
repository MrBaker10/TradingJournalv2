"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/index";
import {
  AccountSaveError,
  saveAccountDraft,
} from "@/db/queries/account-editor";
import {
  type AccountDeletion,
  deleteUnusedAccount,
  getOwnedAccount,
  listActiveAccountsForSwitcher,
  type StartingBalanceValues,
} from "@/db/queries/accounts";
import { accounts } from "@/db/schema/accounts";
import { users } from "@/db/schema/users";
import type { AccountCurrency } from "@/domain/fx";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { convertToUsd } from "@/lib/fx/convert";
import { type MessageValues, messageKey } from "@/lib/i18n/message-keys";
import { exactCents } from "@/lib/money";
import { todayInTimeZone } from "@/lib/time";
import {
  accountIdSchema,
  createAccountSchema,
  moveAccountSchema,
  setSelectedAccountSchema,
  updateAccountSchema,
} from "@/schemas/accounts";

/**
 * A validated starting balance or rule amount as whole cents. The schema has
 * already refused anything `exactCents` cannot read, so the fallback never
 * applies.
 */
function balanceCents(amount: number | undefined): number {
  return amount === undefined ? 0 : (exactCents(amount) ?? 0);
}

/** The same for an optional rule amount: null stays null. */
function optionalCents(amount: number | null): number | null {
  return amount === null ? null : balanceCents(amount);
}

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; values?: MessageValues };

/**
 * A starting balance in the account's currency, with its USD value converted
 * once, now (decided 2026-09-25, account-balance). A USD amount is its own
 * USD value. A foreign one takes the ECB rate that applies today in the
 * trader's zone — fetched if missing — and that rate stays fixed; there is no
 * nightly correction for a balance. Without a reachable rate nothing is
 * written, and the caller says so.
 */
async function startingBalanceValues(
  amountCents: number,
  currency: AccountCurrency,
  timeZone: string,
): Promise<StartingBalanceValues | { error: string; values: MessageValues }> {
  if (currency === "USD" || amountCents === 0) {
    return { amountCents, usdCents: amountCents, rateDate: null };
  }

  const result = await convertToUsd(currency, [
    { cents: amountCents, date: todayInTimeZone(timeZone) },
  ]);
  if (!result.ok) {
    return {
      error: messageKey("errors.accountFxFailed"),
      values: { currency },
    };
  }
  return {
    amountCents,
    usdCents: result.conversions[0].usdCents,
    rateDate: result.conversions[0].rateDate,
  };
}

async function saveAccountInput(
  input: unknown,
  editing: boolean,
): Promise<ActionResult<{ id: number }>> {
  const parsed = (
    editing ? updateAccountSchema : createAccountSchema
  ).safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message };
  const user = await getCurrentUser();
  try {
    const data = parsed.data;
    const saved = await saveAccountDraft(
      user.id,
      {
        accountId: "accountId" in data ? (data.accountId as number) : undefined,
        name: data.name,
        isPractice: data.isPractice,
        currency: data.currency,
        balanceCents: balanceCents(data.startingBalance),
        commissionRates: data.commissionRates.map((rate) => ({
          instrumentId: rate.instrumentId,
          perSideCents: exactCents(rate.perSide) ?? 0,
        })),
        rules: data.rules && {
          programId: data.rules.programId,
          evaluationStart: data.rules.evaluationStart,
          profitTargetCents: balanceCents(data.rules.profitTarget),
          drawdownAmountCents: balanceCents(data.rules.drawdownAmount),
          drawdownType: data.rules.drawdownType,
          lockLevelCents: optionalCents(data.rules.lockLevel),
          dailyLossLimitCents: optionalCents(data.rules.dailyLossLimit),
          consistencyPercent: data.rules.consistencyPercent,
          minTradingDays: data.rules.minTradingDays,
        },
      },
      async (cents, currency) => {
        const result = await startingBalanceValues(
          cents,
          currency,
          user.timezone,
        );
        if ("error" in result)
          throw new AccountSaveError(result.error, result.values);
        return result;
      },
    );
    revalidatePath("/", "layout");
    return { success: true, data: saved };
  } catch (error) {
    if (error instanceof AccountSaveError)
      return { success: false, error: error.message, values: error.values };
    console.error("Account save failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      success: false,
      error: messageKey("errors.accountSaveFailed"),
    };
  }
}

export async function createAccount(
  input: unknown,
): Promise<ActionResult<{ id: number }>> {
  return saveAccountInput(input, false);
}

export async function updateAccount(
  input: unknown,
): Promise<ActionResult<{ id: number }>> {
  return saveAccountInput(input, true);
}

export async function moveAccount(input: unknown): Promise<ActionResult<null>> {
  const parsed = moveAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await getCurrentUser();
  const account = await getOwnedAccount(user.id, parsed.data.accountId);
  if (!account) {
    return { success: false, error: messageKey("errors.accountNotFound") };
  }
  if (account.archivedAt !== null) {
    return {
      success: false,
      error: messageKey("errors.accountArchivedReorder"),
    };
  }

  const active = await listActiveAccountsForSwitcher(user.id);
  const index = active.findIndex((a) => a.id === account.id);
  const neighborIndex = parsed.data.direction === "up" ? index - 1 : index + 1;
  const neighbor = active[neighborIndex];
  if (!neighbor) {
    return {
      success: false,
      error:
        parsed.data.direction === "up"
          ? messageKey("errors.alreadyTop")
          : messageKey("errors.alreadyBottom"),
    };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(accounts)
      .set({ sortOrder: neighbor.sortOrder })
      .where(eq(accounts.id, account.id));
    await tx
      .update(accounts)
      .set({ sortOrder: account.sortOrder })
      .where(eq(accounts.id, neighbor.id));
  });

  revalidatePath("/", "layout");
  return { success: true, data: null };
}

export async function archiveAccount(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = accountIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await getCurrentUser();
  const account = await getOwnedAccount(user.id, parsed.data.accountId);
  if (!account) {
    return { success: false, error: messageKey("errors.accountNotFound") };
  }

  // An archived account can't remain the default for new trades, so both are
  // cleared in the same update regardless of the account's current state.
  await db
    .update(accounts)
    .set({ archivedAt: new Date(), isDefaultForNewTrades: false })
    .where(eq(accounts.id, account.id));

  revalidatePath("/", "layout");
  return { success: true, data: null };
}

export async function unarchiveAccount(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = accountIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await getCurrentUser();
  const account = await getOwnedAccount(user.id, parsed.data.accountId);
  if (!account) {
    return { success: false, error: messageKey("errors.accountNotFound") };
  }

  await db
    .update(accounts)
    .set({ archivedAt: null })
    .where(eq(accounts.id, account.id));

  revalidatePath("/", "layout");
  return { success: true, data: null };
}

export async function hardDeleteAccount(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = accountIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await getCurrentUser();
  let result: AccountDeletion;
  try {
    result = await deleteUnusedAccount(user.id, parsed.data.accountId);
  } catch (error) {
    console.error("Account delete failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      success: false,
      error: messageKey("errors.accountDeleteFailed"),
    };
  }
  if (result === "not-found") {
    return { success: false, error: messageKey("errors.accountNotFound") };
  }
  if (result === "in-use") {
    return {
      success: false,
      error: messageKey("errors.accountStaysArchived"),
    };
  }

  revalidatePath("/", "layout");
  return { success: true, data: null };
}

export async function setDefaultAccount(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = accountIdSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await getCurrentUser();
  const account = await getOwnedAccount(user.id, parsed.data.accountId);
  if (!account) {
    return { success: false, error: messageKey("errors.accountNotFound") };
  }
  if (account.archivedAt !== null) {
    return {
      success: false,
      error: messageKey("errors.accountArchivedDefault"),
    };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(accounts)
      .set({ isDefaultForNewTrades: false })
      .where(
        and(
          eq(accounts.userId, user.id),
          eq(accounts.isDefaultForNewTrades, true),
        ),
      );
    await tx
      .update(accounts)
      .set({ isDefaultForNewTrades: true })
      .where(eq(accounts.id, account.id));
  });

  revalidatePath("/", "layout");
  return { success: true, data: null };
}

export async function setSelectedAccount(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = setSelectedAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await getCurrentUser();

  if (parsed.data.accountId !== null) {
    const account = await getOwnedAccount(user.id, parsed.data.accountId);
    if (!account) {
      return { success: false, error: messageKey("errors.accountNotFound") };
    }
    if (account.archivedAt !== null) {
      return {
        success: false,
        error: messageKey("errors.accountArchivedSelected"),
      };
    }
  }

  await db
    .update(users)
    .set({ selectedAccountId: parsed.data.accountId })
    .where(eq(users.id, user.id));

  revalidatePath("/", "layout");
  return { success: true, data: null };
}

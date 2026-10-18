"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/index";
import {
  AccountSaveError,
  saveAccountDraft,
} from "@/db/queries/account-editor";
import {
  countAssignedTrades,
  getOwnedAccount,
  listActiveAccountsForSwitcher,
  type StartingBalanceValues,
} from "@/db/queries/accounts";
import { accounts } from "@/db/schema/accounts";
import { users } from "@/db/schema/users";
import type { AccountCurrency } from "@/domain/fx";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { convertToUsd } from "@/lib/fx/convert";
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
 * A validated starting balance as whole cents. The schema has already refused
 * anything `exactCents` cannot read, so the fallback never applies.
 */
function balanceCents(amount: number | undefined): number {
  return amount === undefined ? 0 : (exactCents(amount) ?? 0);
}

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

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
): Promise<StartingBalanceValues | { error: string }> {
  if (currency === "USD" || amountCents === 0) {
    return { amountCents, usdCents: amountCents, rateDate: null };
  }

  const result = await convertToUsd(currency, [
    { cents: amountCents, date: todayInTimeZone(timeZone) },
  ]);
  if (!result.ok) {
    return {
      error: `Couldn't fetch the ECB rate to convert ${currency} to USD. Nothing was saved — try again in a moment.`,
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
      },
      async (cents, currency) => {
        const result = await startingBalanceValues(
          cents,
          currency,
          user.timezone,
        );
        if ("error" in result) throw new AccountSaveError(result.error);
        return result;
      },
    );
    revalidatePath("/", "layout");
    return { success: true, data: saved };
  } catch (error) {
    if (error instanceof AccountSaveError)
      return { success: false, error: error.message };
    console.error("Account save failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      success: false,
      error: "Couldn't save the account. Nothing was saved — try again.",
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
    return { success: false, error: "Account not found" };
  }
  if (account.archivedAt !== null) {
    return { success: false, error: "Cannot reorder an archived account" };
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
          ? "Already at the top"
          : "Already at the bottom",
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
    return { success: false, error: "Account not found" };
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
    return { success: false, error: "Account not found" };
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
  const account = await getOwnedAccount(user.id, parsed.data.accountId);
  if (!account) {
    return { success: false, error: "Account not found" };
  }

  const assignedTradeCount = await countAssignedTrades(account.id);
  if (assignedTradeCount > 0) {
    return {
      success: false,
      error: "This account has assigned trades. Archive it instead.",
    };
  }

  await db.delete(accounts).where(eq(accounts.id, account.id));

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
    return { success: false, error: "Account not found" };
  }
  if (account.archivedAt !== null) {
    return {
      success: false,
      error: "An archived account cannot be the default",
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
      return { success: false, error: "Account not found" };
    }
    if (account.archivedAt !== null) {
      return {
        success: false,
        error: "An archived account cannot be selected",
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

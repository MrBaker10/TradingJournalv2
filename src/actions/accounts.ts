"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/index";
import {
  countAssignedTrades,
  getNextSortOrder,
  getOwnedAccount,
  listActiveAccountsForSwitcher,
  type StartingBalanceValues,
  updateAccountCurrency,
  updateStartingBalance,
} from "@/db/queries/accounts";
import { accounts } from "@/db/schema/accounts";
import { users } from "@/db/schema/users";
import type { AccountCurrency } from "@/domain/fx";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { convertToUsd } from "@/lib/fx/convert";
import { dollarsToCents, exactCents, formatCentsPlain } from "@/lib/money";
import { todayInTimeZone } from "@/lib/time";
import {
  createAccountSchema,
  moveAccountSchema,
  renameAccountSchema,
  setAccountCurrencySchema,
  setSelectedAccountSchema,
  setStartingBalanceSchema,
  accountIdSchema as togglePracticeAccountIdSchema,
  togglePracticeSchema,
} from "@/schemas/accounts";

/** A stored `numeric(14, 2)` as whole cents; it has two decimals by type. */
function exactStoredCents(stored: string): number {
  return dollarsToCents(Number(stored));
}

/**
 * A validated starting balance as whole cents. The schema has already refused
 * anything `exactCents` cannot read, so the fallback never applies.
 */
function balanceCents(amount: number | undefined): number {
  return amount === undefined ? 0 : (exactCents(amount) ?? 0);
}

const LOCKED_CURRENCY_ERROR =
  "This account has trades. Its currency can no longer change.";

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

export async function createAccount(
  input: unknown,
): Promise<ActionResult<{ id: number }>> {
  const parsed = createAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await getCurrentUser();
  const balance = await startingBalanceValues(
    balanceCents(parsed.data.startingBalance),
    parsed.data.currency,
    user.timezone,
  );
  if ("error" in balance) {
    return { success: false, error: balance.error };
  }
  const sortOrder = await getNextSortOrder(user.id);

  const [created] = await db
    .insert(accounts)
    .values({
      userId: user.id,
      name: parsed.data.name,
      sortOrder,
      isDefaultForNewTrades: false,
      isPractice: parsed.data.isPractice,
      currency: parsed.data.currency,
      startingBalance: formatCentsPlain(balance.amountCents),
      startingBalanceUsd: formatCentsPlain(balance.usdCents),
      startingBalanceRateDate: balance.rateDate,
    })
    .returning({ id: accounts.id });

  revalidatePath("/", "layout");
  return { success: true, data: { id: created.id } };
}

export async function renameAccount(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = renameAccountSchema.safeParse(input);
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
    .set({ name: parsed.data.name })
    .where(eq(accounts.id, account.id));

  revalidatePath("/", "layout");
  return { success: true, data: null };
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
  const parsed = togglePracticeAccountIdSchema.safeParse(input);
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
  const parsed = togglePracticeAccountIdSchema.safeParse(input);
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
  const parsed = togglePracticeAccountIdSchema.safeParse(input);
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
  const parsed = togglePracticeAccountIdSchema.safeParse(input);
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

export async function togglePractice(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = togglePracticeSchema.safeParse(input);
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
    .set({ isPractice: parsed.data.isPractice })
    .where(eq(accounts.id, account.id));

  revalidatePath("/", "layout");
  return { success: true, data: null };
}

export async function setAccountCurrency(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = setAccountCurrencySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await getCurrentUser();
  const account = await getOwnedAccount(user.id, parsed.data.accountId);
  if (!account) {
    return { success: false, error: "Account not found" };
  }

  // Checked before a rate is fetched: an account with trades cannot change
  // currency, and asking the ECB first would only turn that answer into a
  // rate error when the source is down. The UPDATE re-checks it all the same.
  if ((await countAssignedTrades(account.id)) > 0) {
    return { success: false, error: LOCKED_CURRENCY_ERROR };
  }

  // A starting balance keeps its amount, read in the new currency, and is
  // converted again at today's rate (decided 2026-09-25, account-balance).
  const balance = await startingBalanceValues(
    exactStoredCents(account.startingBalance),
    parsed.data.currency,
    user.timezone,
  );
  if ("error" in balance) {
    return { success: false, error: balance.error };
  }

  // The lock is re-checked inside the UPDATE itself; the disabled select in
  // the UI is only a hint (updateAccountCurrency).
  const updated = await updateAccountCurrency(
    user.id,
    account.id,
    parsed.data.currency,
    db,
    balance,
  );
  if (!updated) {
    return { success: false, error: LOCKED_CURRENCY_ERROR };
  }

  revalidatePath("/", "layout");
  return { success: true, data: null };
}

/**
 * Sets an account's starting balance. Always allowed: it moves where the
 * equity curve starts and changes no trade and no figure of the metric panel.
 */
export async function setStartingBalance(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = setStartingBalanceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await getCurrentUser();
  const account = await getOwnedAccount(user.id, parsed.data.accountId);
  if (!account) {
    return { success: false, error: "Account not found" };
  }

  const balance = await startingBalanceValues(
    balanceCents(parsed.data.startingBalance),
    account.currency,
    user.timezone,
  );
  if ("error" in balance) {
    return { success: false, error: balance.error };
  }

  const updated = await updateStartingBalance(user.id, account.id, balance);
  if (!updated) {
    return { success: false, error: "Account not found" };
  }

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

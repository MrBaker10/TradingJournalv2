"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/index";
import {
  countAssignedTrades,
  getNextSortOrder,
  getOwnedAccount,
  listActiveAccountsForSwitcher,
  updateAccountCurrency,
} from "@/db/queries/accounts";
import { accounts } from "@/db/schema/accounts";
import { users } from "@/db/schema/users";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  createAccountSchema,
  moveAccountSchema,
  renameAccountSchema,
  setAccountCurrencySchema,
  setSelectedAccountSchema,
  accountIdSchema as togglePracticeAccountIdSchema,
  togglePracticeSchema,
} from "@/schemas/accounts";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createAccount(
  input: unknown,
): Promise<ActionResult<{ id: number }>> {
  const parsed = createAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const user = await getCurrentUser();
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

  // The lock is re-checked inside the UPDATE itself; the disabled select in
  // the UI is only a hint (updateAccountCurrency).
  const updated = await updateAccountCurrency(
    user.id,
    account.id,
    parsed.data.currency,
  );
  if (!updated) {
    return {
      success: false,
      error: "This account has trades. Its currency can no longer change.",
    };
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

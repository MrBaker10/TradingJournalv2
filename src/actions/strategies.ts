"use server";

import { revalidatePath } from "next/cache";
import {
  archiveStrategy,
  createStrategy,
  reactivateStrategy,
  StrategyError,
  updateStrategy,
} from "@/db/queries/strategies";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  STRATEGY_ARCHIVE_FAILED,
  STRATEGY_SAVE_FAILED,
  setStrategyArchivedSchema,
  strategyContentSchema,
  updateStrategySchema,
} from "@/schemas/strategies";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Creates a strategy for the current user; the name is the only requirement. */
export async function addStrategy(
  input: unknown,
): Promise<ActionResult<{ id: number }>> {
  const parsed = strategyContentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const user = await getCurrentUser();
    const { id } = await createStrategy(user.id, parsed.data);

    revalidatePath("/strategies");
    return { success: true, data: { id } };
  } catch (error) {
    console.error("Strategy create failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { success: false, error: STRATEGY_SAVE_FAILED };
  }
}

/** Saves new rules for one of the current user's strategies as a revision. */
export async function editStrategy(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = updateStrategySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const user = await getCurrentUser();
    const { strategyId, ...content } = parsed.data;
    await updateStrategy(user.id, strategyId, content);

    revalidatePath("/strategies");
    return { success: true, data: null };
  } catch (error) {
    if (error instanceof StrategyError)
      return { success: false, error: error.message };
    console.error("Strategy update failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { success: false, error: STRATEGY_SAVE_FAILED };
  }
}

/**
 * Archives or reactivates one of the current user's strategies. Trades that
 * hold it keep their rules and answers; only new assignments are affected.
 */
export async function setStrategyArchived(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = setStrategyArchivedSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const user = await getCurrentUser();
    const { strategyId, archived } = parsed.data;
    if (archived) await archiveStrategy(user.id, strategyId);
    else await reactivateStrategy(user.id, strategyId);

    revalidatePath("/strategies");
    return { success: true, data: null };
  } catch (error) {
    if (error instanceof StrategyError)
      return { success: false, error: error.message };
    console.error("Strategy archive change failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { success: false, error: STRATEGY_ARCHIVE_FAILED };
  }
}

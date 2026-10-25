"use server";

import { revalidatePath } from "next/cache";
import {
  ChecklistError,
  createChecklistItem,
  deleteChecklistItem,
  moveChecklistItem,
  renameChecklistItem,
  setChecklistCheck,
} from "@/db/queries/checklist";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { todayInTimeZone } from "@/lib/time";
import {
  CHECKLIST_MOVE_FAILED,
  CHECKLIST_PHASE_FULL,
  CHECKLIST_SAVE_FAILED,
  CHECKLIST_TICK_FAILED,
  checklistItemIdSchema,
  checklistItemSchema,
  moveChecklistItemSchema,
  renameChecklistItemSchema,
  setChecklistCheckSchema,
} from "@/schemas/checklist";

type ActionResult =
  | { success: true; data: null }
  | { success: false; error: string; field?: "text" };

function failure(
  error: unknown,
  fallback: string = CHECKLIST_SAVE_FAILED,
): ActionResult {
  if (error instanceof ChecklistError)
    return {
      success: false,
      error: error.message,
      ...(error.message === CHECKLIST_PHASE_FULL
        ? { field: "text" as const }
        : {}),
    };
  console.error("Checklist write failed", {
    name: error instanceof Error ? error.name : "UnknownError",
  });
  return { success: false, error: fallback };
}

function revalidateChecklist() {
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function addChecklistStep(input: unknown): Promise<ActionResult> {
  const parsed = checklistItemSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      error: parsed.error.issues[0].message,
      field: "text",
    };
  try {
    const user = await getCurrentUser();
    await createChecklistItem(user.id, parsed.data);
    revalidateChecklist();
    return { success: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function renameChecklistStep(
  input: unknown,
): Promise<ActionResult> {
  const parsed = renameChecklistItemSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      error: parsed.error.issues[0].message,
      field: "text",
    };
  try {
    const user = await getCurrentUser();
    await renameChecklistItem(user.id, parsed.data.itemId, parsed.data.text);
    revalidateChecklist();
    return { success: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteChecklistStep(
  input: unknown,
): Promise<ActionResult> {
  const parsed = checklistItemIdSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message };
  try {
    const user = await getCurrentUser();
    await deleteChecklistItem(
      user.id,
      parsed.data.itemId,
      todayInTimeZone(user.timezone),
    );
    revalidateChecklist();
    return { success: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

export async function moveChecklistStep(input: unknown): Promise<ActionResult> {
  const parsed = moveChecklistItemSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message };
  try {
    const user = await getCurrentUser();
    await moveChecklistItem(user.id, parsed.data.itemId, parsed.data.direction);
    revalidateChecklist();
    return { success: true, data: null };
  } catch (error) {
    return failure(error, CHECKLIST_MOVE_FAILED);
  }
}

/**
 * Ticks or unticks a step on the user's today, resolved here from
 * `users.timezone` like the pre-market plan. Feeds no streak, score or badge.
 */
export async function setChecklistStepChecked(
  input: unknown,
): Promise<ActionResult> {
  const parsed = setChecklistCheckSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message };
  try {
    const user = await getCurrentUser();
    await setChecklistCheck(
      user.id,
      parsed.data.itemId,
      todayInTimeZone(user.timezone),
      parsed.data.checked,
    );
    revalidateChecklist();
    return { success: true, data: null };
  } catch (error) {
    return failure(error, CHECKLIST_TICK_FAILED);
  }
}

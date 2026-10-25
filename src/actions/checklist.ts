"use server";

import { revalidatePath } from "next/cache";
import {
  ChecklistError,
  createChecklistItem,
  deleteChecklistItem,
  renameChecklistItem,
} from "@/db/queries/checklist";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  CHECKLIST_PHASE_FULL,
  CHECKLIST_SAVE_FAILED,
  checklistItemIdSchema,
  checklistItemSchema,
  renameChecklistItemSchema,
} from "@/schemas/checklist";

type ActionResult =
  | { success: true; data: null }
  | { success: false; error: string; field?: "text" };

function failure(error: unknown): ActionResult {
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
  return { success: false, error: CHECKLIST_SAVE_FAILED };
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
    await deleteChecklistItem(user.id, parsed.data.itemId);
    revalidateChecklist();
    return { success: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

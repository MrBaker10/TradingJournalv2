"use server";

import { revalidatePath } from "next/cache";
import {
  SetupGuideError,
  saveSetupGuideAnswer,
} from "@/db/queries/setup-guide";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import {
  answerSetupGuideSchema,
  SETUP_GUIDE_SAVE_FAILED,
} from "@/schemas/setup-guide";

type ActionResult =
  | { success: true; data: null }
  | { success: false; error: string };

function failure(error: unknown): ActionResult {
  if (error instanceof SetupGuideError)
    return { success: false, error: error.message };
  console.error("Setup guide write failed", {
    name: error instanceof Error ? error.name : "UnknownError",
  });
  return { success: false, error: SETUP_GUIDE_SAVE_FAILED };
}

/**
 * The question card's answer. The query refuses it unless the rules show the
 * question, which covers the demo user and a second answer.
 */
export async function answerSetupGuide(input: unknown): Promise<ActionResult> {
  const parsed = answerSetupGuideSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: SETUP_GUIDE_SAVE_FAILED };
  try {
    const user = await getCurrentUser();
    await saveSetupGuideAnswer(user.id, parsed.data.answer);
    revalidatePath("/dashboard");
    revalidatePath("/settings");
    return { success: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

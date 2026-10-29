"use server";

import {
  applySetupGuideAction,
  SetupGuideError,
} from "@/db/queries/setup-guide";
import type { SetupGuideAction } from "@/domain/setup-guide";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { revalidatePage } from "@/lib/i18n/revalidate";
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

// The query refuses whatever the rules do not offer right now
// (nextSetupGuideState).
async function apply(
  action: SetupGuideAction,
  { revalidate = true } = {},
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    await applySetupGuideAction(user.id, action);
    if (revalidate) {
      revalidatePage("/dashboard");
      revalidatePage("/settings");
    }
    return { success: true, data: null };
  } catch (error) {
    return failure(error);
  }
}

/** The question card's answer. */
export async function answerSetupGuide(input: unknown): Promise<ActionResult> {
  const parsed = answerSetupGuideSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: SETUP_GUIDE_SAVE_FAILED };
  return apply(parsed.data.answer);
}

/** The card's hide action, offered once an account exists. */
export async function hideSetupGuide(): Promise<ActionResult> {
  return apply("hide");
}

/** Settings' "Show setup guide", offered while a required step is open. */
export async function showSetupGuide(): Promise<ActionResult> {
  return apply("show");
}

/**
 * Called by the completion card once it has mounted, not while the dashboard
 * renders: a GET that writes would spend the moment even when the response
 * never reached anyone. No revalidation, like markDashboardSeen: a re-render
 * would cut the sweep short, and the next request reads the new state anyway.
 */
export async function completeSetupGuide(): Promise<ActionResult> {
  return apply("complete", { revalidate: false });
}

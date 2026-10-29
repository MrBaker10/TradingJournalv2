"use server";

import {
  InterfaceLanguageError,
  saveInterfaceLanguage,
} from "@/db/queries/interface-language";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import type { Language } from "@/lib/i18n/languages";
import { messageKey } from "@/lib/i18n/message-keys";
import { setInterfaceLanguageSchema } from "@/schemas/interface-language";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Settings' language switch (docs/adr/0008). Stores the language on the user;
 * the client then moves to the same page under the new prefix. For the demo
 * user nothing is stored and the move alone switches this browser.
 */
export async function setInterfaceLanguage(
  input: unknown,
): Promise<ActionResult<Language>> {
  // Outside the try: without a session it redirects, and that must not be
  // caught as a failure.
  const user = await getCurrentUser();
  const parsed = setInterfaceLanguageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: messageKey("validation.languageUnknown") };
  }
  try {
    await saveInterfaceLanguage(user.id, parsed.data);
    return { success: true, data: parsed.data };
  } catch (error) {
    if (error instanceof InterfaceLanguageError) {
      return { success: false, error: error.message };
    }
    console.error("Interface language write failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { success: false, error: messageKey("errors.languageSaveFailed") };
  }
}

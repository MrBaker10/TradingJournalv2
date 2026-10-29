"use server";

import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { messageKey } from "@/lib/i18n/message-keys";
import {
  THEME_COOKIE,
  THEME_COOKIE_OPTIONS,
  type ThemePick,
} from "@/lib/theme";
import { setThemeSchema } from "@/schemas/theme";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Remembers the theme on this device (docs/adr/0007): a cookie, not a column,
 * so demo visitors keep their own pick. The cookie belongs to the device, but
 * like every action this one runs behind a session (coding-standards.md →
 * Visibility); the switch only exists there anyway. The client has already
 * swapped the class on <body>; the re-render this cookie causes agrees.
 */
export async function setTheme(
  pick: unknown,
): Promise<ActionResult<ThemePick>> {
  // Outside the try: without a session it redirects, and that must not be
  // caught as a failure.
  await getCurrentUser();
  const parsed = setThemeSchema.safeParse(pick);
  if (!parsed.success) {
    return { success: false, error: messageKey("validation.themeUnknown") };
  }
  try {
    const cookieStore = await cookies();
    cookieStore.set(THEME_COOKIE, parsed.data, THEME_COOKIE_OPTIONS);
    return { success: true, data: parsed.data };
  } catch (error) {
    console.error(error);
    return { success: false, error: messageKey("errors.themeSaveFailed") };
  }
}

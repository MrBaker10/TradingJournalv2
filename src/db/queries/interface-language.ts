import { eq } from "drizzle-orm";
import { isDemoUsername } from "../../domain/demo.ts";
import { isLanguage } from "../../lib/i18n/languages.ts";
import { messageKey } from "../../lib/i18n/message-keys.ts";
import { db } from "../index.ts";
import { users } from "../schema/users.ts";

export class InterfaceLanguageError extends Error {}

/**
 * Stores the user's interface language (docs/adr/0008). The shared demo user
 * is never written, so one visitor cannot switch the language for the others;
 * its visitors switch through the URL alone. "demo" tells the caller so.
 */
export async function saveInterfaceLanguage(
  userId: number,
  language: unknown,
  executor: Pick<typeof db, "select" | "update"> = db,
): Promise<"saved" | "demo"> {
  if (!isLanguage(language)) {
    throw new InterfaceLanguageError(messageKey("validation.languageUnknown"));
  }
  const [user] = await executor
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, userId));
  if (user === undefined) throw new Error("Interface language: no such user.");
  if (isDemoUsername(user.username)) return "demo";
  await executor.update(users).set({ language }).where(eq(users.id, userId));
  return "saved";
}

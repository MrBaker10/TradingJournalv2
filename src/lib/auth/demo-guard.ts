import { isDemoUsername } from "../../domain/demo.ts";

// What the shared demo account may not do (coding-standards.md → Visibility):
// everything that would lock the other visitors out or empty the demo. The
// auth hook in ./auth.ts asks these; nothing here touches a request.

/**
 * Better Auth endpoints refused for the demo user: password, two-factor,
 * deleting the account, and signing other sessions out.
 */
const DEMO_REFUSED_PATHS = new Set([
  "/change-password",
  "/two-factor/enable",
  "/two-factor/disable",
  "/delete-user",
  "/revoke-session",
  "/revoke-sessions",
  "/revoke-other-sessions",
]);

export const DEMO_REFUSED_MESSAGE = "That is off on the demo account.";

export function refusedOnDemo(path: string): boolean {
  return DEMO_REFUSED_PATHS.has(path);
}

/**
 * A sign-up for the reserved demo name, in any spelling. Without a `username`
 * the username plugin takes `displayUsername` — in its own hook, which runs
 * after ours — so that one counts too.
 */
export function signsUpAsDemo(
  path: string,
  body: { username?: unknown; displayUsername?: unknown } | undefined,
): boolean {
  const name = body?.username ?? body?.displayUsername;
  return (
    path === "/sign-up/email" &&
    typeof name === "string" &&
    isDemoUsername(name.trim())
  );
}

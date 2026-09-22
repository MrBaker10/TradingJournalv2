import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "../../db/index.ts";
import { users } from "../../db/schema/users.ts";
import { auth } from "./auth.ts";

/**
 * The signed-in user's `users` row — the only way to the current user
 * (coding-standards.md, "Auth and storage seams").
 *
 * Phase 2: reads the Better Auth session. Without one it redirects to
 * /login, so no page, Server Action or route handler behind it ever runs
 * for nobody; proxy.ts turns most such requests away earlier, but this is
 * the check that holds when a matcher misses. The signature is the same as
 * in phase 1, and so is the row it returns.
 *
 * Wrapped in React's `cache`, so the layout and the page of one request share
 * one session lookup instead of doing their own. The cache lives for that
 * request only; nothing carries over to the next one.
 */
export const getCurrentUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  // Better Auth hands integer ids over as strings (generateId: "serial").
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, Number(session.user.id)))
    .limit(1);

  // A session whose user is gone: deleted in another tab, say. Same answer.
  if (!user) {
    redirect("/login");
  }

  return user;
});

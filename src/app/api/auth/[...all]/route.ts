import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth/auth";

// Better Auth's own endpoints: sign-in, sign-up, sign-out, 2FA, password
// change, account deletion. The one route family proxy.ts lets through
// without a session, because signing in is how a session starts.
export const { GET, POST } = toNextJsHandler(auth);

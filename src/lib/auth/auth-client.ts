"use client";

import {
  inferAdditionalFields,
  twoFactorClient,
  usernameClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "./auth.ts";

// The browser half of Better Auth, for the login, register and settings
// forms. It talks to /api/auth/* on the same origin; no base URL needed.
// Everything server-side goes through getCurrentUser() instead.
export const authClient = createAuthClient({
  // Type-only: teaches the client the `timezone` field sign-up takes.
  plugins: [
    usernameClient(),
    twoFactorClient(),
    inferAdditionalFields<typeof auth>(),
  ],
});

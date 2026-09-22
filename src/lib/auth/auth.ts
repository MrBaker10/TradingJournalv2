import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { twoFactor, username } from "better-auth/plugins";
import { db } from "../../db/index.ts";
import {
  authAccounts,
  authSessions,
  authTwoFactors,
  authVerifications,
} from "../../db/schema/auth.ts";
import { users } from "../../db/schema/users.ts";
import { env } from "../env.ts";
import { deleteUserFiles, listUserStorageKeys } from "./delete-user-files.ts";
import { placeholderEmail } from "./placeholder-email.ts";

const DAY_SECONDS = 60 * 60 * 24;

// Storage keys collected before a user row is deleted, removed from disk
// after it is gone. The cascade takes the screenshot rows with it, so the
// keys have to be read first; the files go only once the delete succeeded,
// so a failed delete never leaves a journal pointing at missing images.
const pendingFileDeletes = new Map<string, string[]>();

/**
 * The Better Auth instance. Besides src/lib/auth/ only the two pieces of
 * plumbing import it — src/proxy.ts and the /api/auth route handler. Pages,
 * actions and queries reach the user through `getCurrentUser()`
 * (coding-standards.md, "Auth and storage seams").
 */
export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  telemetry: { enabled: false },
  // Answers "does this username exist?" to anyone, signed in or not. The
  // login deliberately does not (one message for both cases), and nothing in
  // the app calls it.
  disabledPaths: ["/is-username-available"],

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      users,
      authSessions,
      authAccounts,
      authVerifications,
      authTwoFactors,
    },
  }),
  advanced: {
    // Every table here uses integer identity ids; Postgres assigns them.
    database: { generateId: "serial" },
  },

  // Better Auth's models mapped onto this app's tables. Its "account" is a
  // credential (the password hash), not a trading account — hence auth_*.
  user: {
    modelName: "users",
    fields: { name: "displayName" },
    additionalFields: {
      timezone: { type: "string", required: true, input: true },
    },
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        pendingFileDeletes.set(
          user.id,
          await listUserStorageKeys(Number(user.id)),
        );
      },
      afterDelete: async (user) => {
        const keys = pendingFileDeletes.get(user.id) ?? [];
        pendingFileDeletes.delete(user.id);
        await deleteUserFiles(keys);
      },
    },
  },
  session: {
    modelName: "authSessions",
    // Seven days, extended once a day while the app is in use.
    expiresIn: 7 * DAY_SECONDS,
    updateAge: DAY_SECONDS,
  },
  account: { modelName: "authAccounts" },
  verification: { modelName: "authVerifications" },

  emailAndPassword: {
    enabled: true,
    // REGISTRATION_OPEN=true opens /register; anything else closes the
    // endpoint as well as the screen.
    disableSignUp: !env.REGISTRATION_OPEN,
  },

  databaseHooks: {
    user: {
      create: {
        // The email is always the placeholder, whatever the client sent.
        before: async (user) => ({
          data: {
            ...user,
            email: placeholderEmail(String(user.username)),
          },
        }),
      },
    },
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Deleting an account always needs the password. Without one Better
      // Auth would accept any session younger than a day.
      if (ctx.path === "/delete-user" && !ctx.body?.password) {
        throw new APIError("BAD_REQUEST", {
          message: "Enter your password to delete your account.",
        });
      }
      // The username is immutable, and so is everything derived from it.
      // The username plugin guards `username` itself (immutableUsername);
      // this covers the spelling and the placeholder email beside it.
      if (
        ctx.path === "/update-user" &&
        (ctx.body?.displayUsername !== undefined ||
          ctx.body?.email !== undefined)
      ) {
        throw new APIError("BAD_REQUEST", {
          message: "The username cannot be changed.",
        });
      }
    }),
  },

  plugins: [
    username({ immutableUsername: true }),
    twoFactor({
      issuer: "Trading-Journal",
      schema: { twoFactor: { modelName: "authTwoFactors" } },
    }),
    // Lets Server Actions set Better Auth's cookies. Must stay last.
    nextCookies(),
  ],
});

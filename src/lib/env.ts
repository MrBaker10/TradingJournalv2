import * as z from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  // Neon's direct (unpooled) connection. Only drizzle-kit reads it: migrations
  // need a session, which the transaction-mode pooler behind DATABASE_URL does
  // not keep. Unset locally, where DATABASE_URL is already direct.
  DATABASE_URL_DIRECT: z.url({ protocol: /^postgres(ql)?$/ }).optional(),
  // Signs screenshot URLs (src/lib/uploads/signed-url.ts) so a raw storage
  // key alone is never enough to fetch a file from /api/uploads.
  UPLOAD_SIGNING_SECRET: z.string().min(32),
  // Better Auth signs session cookies and encrypts TOTP secrets and backup
  // codes with this. Rotating it signs everyone out and makes stored 2FA
  // secrets unreadable.
  BETTER_AUTH_SECRET: z.string().min(32),
  // The app's own origin, e.g. http://localhost:3000. Better Auth checks
  // request origins against it.
  BETTER_AUTH_URL: z.url({ protocol: /^https?$/ }),
  // Whether /register accepts new users. Anything but the literal "true" is
  // closed, so a deployment that forgets the variable is closed too.
  REGISTRATION_OPEN: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  // Set by Vercel on every deployment (hostnames, no scheme); unset locally.
  // Feed Better Auth's trustedOrigins (src/lib/auth/trusted-origins.ts).
  VERCEL_URL: z.string().optional(),
  VERCEL_BRANCH_URL: z.string().optional(),
});

export const env = envSchema.parse(process.env);

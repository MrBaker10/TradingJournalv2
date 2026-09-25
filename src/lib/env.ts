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
  // Vercel Cron sends it as `Authorization: Bearer <CRON_SECRET>`; the cron
  // routes (/api/cron/*) accept nothing else. Unset locally, where the jobs
  // run as `pnpm job:*` and the routes answer 401.
  CRON_SECRET: z.string().min(32).optional(),
  // Which storage adapter serves screenshots (src/lib/storage/index.ts).
  // Explicit rather than inferred from the R2 variables, so that a deployment
  // missing them fails at startup instead of silently writing to a read-only
  // disk — and so R2 can be exercised locally before it is exercised in
  // production.
  STORAGE_DRIVER: z.enum(["local", "r2"]).default("local"),
  // R2 speaks the S3 API. The full endpoint rather than the account id: a
  // bucket created with a jurisdiction is reachable only through its own host
  // (https://<id>.eu.r2.cloudflarestorage.com), and building that string from
  // parts would hard-code which jurisdictions exist.
  R2_ENDPOINT: z.url({ protocol: /^https$/ }).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET: z.string().min(1).optional(),
});

/** The four R2 variables are optional above, but required once the driver is `r2`. */
const withStorageDriver = envSchema.superRefine((value, ctx) => {
  if (value.STORAGE_DRIVER !== "r2") {
    return;
  }
  for (const key of [
    "R2_ENDPOINT",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET",
  ] as const) {
    if (!value[key]) {
      ctx.addIssue({
        code: "custom",
        path: [key],
        message: `${key} is required when STORAGE_DRIVER is "r2".`,
      });
    }
  }
});

/** Exported for the storage tests; the app reads `env`. */
export const environmentSchema = withStorageDriver;

export const env = withStorageDriver.parse(process.env);

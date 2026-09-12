import * as z from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  // Signs screenshot URLs (src/lib/uploads/signed-url.ts) so a raw storage
  // key alone is never enough to fetch a file from /api/uploads.
  UPLOAD_SIGNING_SECRET: z.string().min(32),
});

export const env = envSchema.parse(process.env);

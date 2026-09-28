import { timingSafeEqual } from "node:crypto";

// The one check behind every /api/cron/* route. Vercel Cron calls them with
// `Authorization: Bearer <CRON_SECRET>` and no session; the proxy lets the
// prefix through, so this comparison is the whole gate. Constant time, and
// closed when the secret is unset — which it is locally, where the jobs run
// as `pnpm job:*` instead.

export function isCronAuthorized(
  header: string | null,
  secret: string | undefined,
): boolean {
  if (secret === undefined || header === null) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

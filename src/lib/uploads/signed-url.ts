import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../env.ts";

// Screenshots are private (coding-standards.md: "served through signed URLs
// only"). A URL is valid for an hour and is reissued fresh on every page
// render — issuing (here) and verifying (the /api/uploads route handler) both
// go through this same function, so there is exactly one place that knows the
// signing scheme.
const SIGNED_URL_TTL_MS = 60 * 60 * 1000;

function sign(storageKey: string, expires: number): string {
  return createHmac("sha256", env.UPLOAD_SIGNING_SECRET)
    .update(`${storageKey}:${expires}`)
    .digest("hex");
}

export function createSignedUploadUrl(storageKey: string): string {
  const expires = Date.now() + SIGNED_URL_TTL_MS;
  const signature = sign(storageKey, expires);
  const params = new URLSearchParams({
    key: storageKey,
    expires: String(expires),
    sig: signature,
  });
  return `/api/uploads?${params.toString()}`;
}

export function verifySignedUploadUrl(
  key: string,
  expires: string,
  signature: string,
): boolean {
  const expiresNum = Number(expires);
  if (!Number.isFinite(expiresNum) || expiresNum < Date.now()) {
    return false;
  }

  const expected = Buffer.from(sign(key, expiresNum), "hex");
  const actual = Buffer.from(signature, "hex");
  if (expected.length !== actual.length) {
    return false;
  }
  return timingSafeEqual(expected, actual);
}

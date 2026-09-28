import { describe, expect, it } from "vitest";
import { isCronAuthorized } from "../cron-auth.ts";

const secret = "s".repeat(32);

describe("isCronAuthorized", () => {
  it("accepts the bearer secret exactly", () => {
    expect(isCronAuthorized(`Bearer ${secret}`, secret)).toBe(true);
  });

  it("rejects a wrong, shorter, longer or bare secret", () => {
    for (const header of [
      `Bearer ${"t".repeat(32)}`,
      `Bearer ${secret.slice(1)}`,
      `Bearer ${secret}x`,
      secret,
    ]) {
      expect(isCronAuthorized(header, secret)).toBe(false);
    }
  });

  it("rejects a missing header", () => {
    expect(isCronAuthorized(null, secret)).toBe(false);
  });

  it("stays closed while no secret is configured", () => {
    expect(isCronAuthorized("Bearer undefined", undefined)).toBe(false);
    expect(isCronAuthorized(null, undefined)).toBe(false);
  });
});

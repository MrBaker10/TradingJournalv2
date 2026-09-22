import { describe, expect, it } from "vitest";
import { withAccountLabel } from "../totp-label.ts";

const URI =
  "otpauth://totp/Trading-Journal:trader%40users.invalid?secret=JBSWY3DPEHPK3PXP&issuer=Trading-Journal&algorithm=SHA1&digits=6&period=30";

describe("withAccountLabel", () => {
  it("replaces the placeholder email with the username", () => {
    const result = withAccountLabel(URI, "trader");
    expect(decodeURIComponent(new URL(result).pathname)).toBe(
      "/Trading-Journal:trader",
    );
    expect(result).not.toContain("users.invalid");
  });

  it("leaves everything the code depends on untouched", () => {
    const before = new URL(URI);
    const after = new URL(withAccountLabel(URI, "trader"));
    expect(after.protocol).toBe("otpauth:");
    expect(after.host).toBe("totp");
    expect(after.search).toBe(before.search);
  });
});

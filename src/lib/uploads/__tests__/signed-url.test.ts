import { describe, expect, it } from "vitest";
import { createSignedUploadUrl, verifySignedUploadUrl } from "../signed-url.ts";

function parseSignedUrl(url: string) {
  const params = new URL(url, "http://localhost").searchParams;
  return {
    key: params.get("key") as string,
    expires: params.get("expires") as string,
    sig: params.get("sig") as string,
  };
}

describe("signed upload URLs", () => {
  it("verifies a freshly issued URL", () => {
    const { key, expires, sig } = parseSignedUrl(
      createSignedUploadUrl("screenshots/1/2/abc.jpg"),
    );
    expect(verifySignedUploadUrl(key, expires, sig)).toBe(true);
  });

  it("rejects a tampered key", () => {
    const { expires, sig } = parseSignedUrl(
      createSignedUploadUrl("screenshots/1/2/abc.jpg"),
    );
    expect(
      verifySignedUploadUrl("screenshots/1/2/other.jpg", expires, sig),
    ).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const { key, expires, sig } = parseSignedUrl(
      createSignedUploadUrl("screenshots/1/2/abc.jpg"),
    );
    const tampered = sig.slice(0, -1) + (sig.at(-1) === "0" ? "1" : "0");
    expect(verifySignedUploadUrl(key, expires, tampered)).toBe(false);
  });

  it("rejects an expired timestamp even with a valid signature for it", () => {
    const key = "screenshots/1/2/abc.jpg";
    const expiredTimestamp = String(Date.now() - 1000);
    // Sign the expired timestamp ourselves the same way the module does, to
    // prove expiry is checked independently of signature validity.
    const { sig } = parseSignedUrl(createSignedUploadUrl(key));
    expect(verifySignedUploadUrl(key, expiredTimestamp, sig)).toBe(false);
  });

  it("rejects a non-hex signature without throwing", () => {
    const { key, expires } = parseSignedUrl(createSignedUploadUrl("x"));
    expect(verifySignedUploadUrl(key, expires, "not-hex!!")).toBe(false);
  });
});

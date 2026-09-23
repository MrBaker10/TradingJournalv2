import { describe, expect, it } from "vitest";
import { environmentSchema } from "../../env.ts";
import { createStorage } from "../index.ts";
import { LocalDiskStorage } from "../local-disk.ts";
import { isNotFound, R2Storage } from "../r2.ts";

const r2Config = {
  STORAGE_DRIVER: "r2",
  R2_ENDPOINT: "https://account.eu.r2.cloudflarestorage.com",
  R2_ACCESS_KEY_ID: "key-id",
  R2_SECRET_ACCESS_KEY: "secret",
  R2_BUCKET: "screenshots",
} as const;

// Enough to satisfy the rest of the schema; the storage rules are what is
// under test.
const otherVars = {
  DATABASE_URL: "postgres://localhost:5432/test",
  UPLOAD_SIGNING_SECRET: "x".repeat(32),
  BETTER_AUTH_SECRET: "y".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
};

describe("storage adapter selection", () => {
  it("uses local disk for the local driver", () => {
    expect(createStorage({ STORAGE_DRIVER: "local" })).toBeInstanceOf(
      LocalDiskStorage,
    );
  });

  it("uses R2 for the r2 driver", () => {
    expect(createStorage(r2Config)).toBeInstanceOf(R2Storage);
  });
});

// A missing object is not an error: the upload route turns `null` into a 404
// (src/app/api/uploads/route.ts). Anything else has to keep throwing, or a
// broken bucket would look like a deleted screenshot.
describe("R2 missing-object detection", () => {
  it("treats NoSuchKey as missing", () => {
    expect(isNotFound({ name: "NoSuchKey" })).toBe(true);
  });

  it("treats NotFound as missing", () => {
    expect(isNotFound({ name: "NotFound" })).toBe(true);
  });

  it("treats a 404 without a name as missing", () => {
    expect(isNotFound({ $metadata: { httpStatusCode: 404 } })).toBe(true);
  });

  it.each([
    [
      "access denied",
      { name: "AccessDenied", $metadata: { httpStatusCode: 403 } },
    ],
    [
      "a server fault",
      { name: "InternalError", $metadata: { httpStatusCode: 500 } },
    ],
    ["a bad signature", { name: "SignatureDoesNotMatch" }],
    ["a plain error", new Error("socket hang up")],
  ])("does not treat %s as missing", (_label, error) => {
    expect(isNotFound(error)).toBe(false);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a string", "NoSuchKey"],
  ])("does not treat %s as missing", (_label, error) => {
    expect(isNotFound(error)).toBe(false);
  });
});

describe("storage environment", () => {
  it("defaults to the local driver", () => {
    const parsed = environmentSchema.parse(otherVars);
    expect(parsed.STORAGE_DRIVER).toBe("local");
  });

  it("accepts the r2 driver with all four variables", () => {
    expect(() =>
      environmentSchema.parse({ ...otherVars, ...r2Config }),
    ).not.toThrow();
  });

  it.each([
    "R2_ENDPOINT",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET",
  ])("rejects the r2 driver without %s", (missing) => {
    const withoutOne: Record<string, unknown> = {
      ...otherVars,
      ...r2Config,
    };
    delete withoutOne[missing];

    const result = environmentSchema.safeParse(withoutOne);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toContain(
      missing,
    );
  });

  it("rejects an unknown driver", () => {
    expect(
      environmentSchema.safeParse({ ...otherVars, STORAGE_DRIVER: "s3" })
        .success,
    ).toBe(false);
  });
});

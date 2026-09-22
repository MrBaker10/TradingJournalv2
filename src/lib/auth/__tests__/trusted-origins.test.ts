import { describe, expect, it } from "vitest";
import { deploymentOrigins } from "../trusted-origins.ts";

describe("deploymentOrigins", () => {
  it("trusts the deployment URL and the branch alias as https origins", () => {
    expect(
      deploymentOrigins({
        VERCEL_URL: "tradingjournal-abc123-team.vercel.app",
        VERCEL_BRANCH_URL: "tradingjournal-git-feature-x-team.vercel.app",
      }),
    ).toEqual([
      "https://tradingjournal-abc123-team.vercel.app",
      "https://tradingjournal-git-feature-x-team.vercel.app",
    ]);
  });

  it("is empty outside Vercel, so local development trusts nothing extra", () => {
    expect(deploymentOrigins({})).toEqual([]);
  });

  it("skips a variable that is set but empty", () => {
    expect(
      deploymentOrigins({ VERCEL_URL: "a.vercel.app", VERCEL_BRANCH_URL: "" }),
    ).toEqual(["https://a.vercel.app"]);
  });

  it("lists a host only once when both variables name it", () => {
    expect(
      deploymentOrigins({
        VERCEL_URL: "a.vercel.app",
        VERCEL_BRANCH_URL: "a.vercel.app",
      }),
    ).toEqual(["https://a.vercel.app"]);
  });

  it("never produces a wildcard", () => {
    const origins = deploymentOrigins({
      VERCEL_URL: "a.vercel.app",
      VERCEL_BRANCH_URL: "b.vercel.app",
    });
    expect(origins.some((origin) => origin.includes("*"))).toBe(false);
  });
});

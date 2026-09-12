import { describe, expect, it } from "vitest";
import { canAddScreenshot, validateTradeAccountAssignment } from "../trades.ts";

describe("validateTradeAccountAssignment", () => {
  it("fails a taken trade with no accounts", () => {
    expect(
      validateTradeAccountAssignment({ taken: true, accountIds: [] }),
    ).toEqual({
      success: false,
      error: "A taken trade needs at least one account.",
    });
  });

  it("passes a taken trade with one account", () => {
    expect(
      validateTradeAccountAssignment({ taken: true, accountIds: [1] }),
    ).toEqual({ success: true });
  });

  it("passes a taken trade with several accounts", () => {
    expect(
      validateTradeAccountAssignment({ taken: true, accountIds: [1, 2] }),
    ).toEqual({ success: true });
  });

  it("passes a missed setup with no accounts", () => {
    expect(
      validateTradeAccountAssignment({ taken: false, accountIds: [] }),
    ).toEqual({ success: true });
  });

  it("fails a missed setup with an account assigned", () => {
    expect(
      validateTradeAccountAssignment({ taken: false, accountIds: [1] }),
    ).toEqual({
      success: false,
      error: "A missed setup cannot be assigned to an account.",
    });
  });
});

describe("canAddScreenshot", () => {
  it("passes with zero existing screenshots", () => {
    expect(canAddScreenshot(0)).toEqual({ success: true });
  });

  it("passes with two existing screenshots", () => {
    expect(canAddScreenshot(2)).toEqual({ success: true });
  });

  it("fails at the third existing screenshot", () => {
    expect(canAddScreenshot(3)).toEqual({
      success: false,
      error: "A trade can have at most 3 screenshots.",
    });
  });

  it("fails beyond three existing screenshots", () => {
    expect(canAddScreenshot(4)).toEqual({
      success: false,
      error: "A trade can have at most 3 screenshots.",
    });
  });
});

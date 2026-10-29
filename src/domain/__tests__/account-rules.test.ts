import { describe, expect, it } from "vitest";
import { checkLinkable, validateAccountRules } from "../account-rules.ts";

describe("validateAccountRules", () => {
  it("passes an EOD trailing drawdown with a lock level", () => {
    expect(
      validateAccountRules({
        drawdownType: "eod_trailing",
        lockLevelCents: 5_000_000,
      }),
    ).toEqual({ success: true });
  });

  it("fails a lock level on a static or intraday trailing drawdown", () => {
    for (const drawdownType of ["static", "intraday_trailing"] as const) {
      expect(
        validateAccountRules({ drawdownType, lockLevelCents: 5_000_000 }),
      ).toEqual({
        success: false,
        field: "lockLevel",
        error: "validation.lockLevelType",
      });
    }
  });
});

describe("checkLinkable", () => {
  it("passes a real account with a starting balance", () => {
    expect(
      checkLinkable({ isPractice: false, startingBalanceUsdCents: 5_000_000 }),
    ).toEqual({ success: true });
  });

  it("fails a practice account", () => {
    expect(
      checkLinkable({ isPractice: true, startingBalanceUsdCents: 5_000_000 }),
    ).toEqual({
      success: false,
      field: "isPractice",
      error: "validation.practiceNotLinkable",
    });
  });

  it("fails an account without a starting balance", () => {
    expect(
      checkLinkable({ isPractice: false, startingBalanceUsdCents: 0 }),
    ).toEqual({
      success: false,
      field: "startingBalance",
      error: "validation.startingBalanceForLink",
    });
  });
});

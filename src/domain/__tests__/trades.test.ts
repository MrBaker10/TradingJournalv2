import { describe, expect, it } from "vitest";
import {
  canAddScreenshot,
  importMarksAfterEdit,
  validateTradeAccountAssignment,
} from "../trades.ts";

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

describe("importMarksAfterEdit", () => {
  const imported = {
    stopPrice: "30205.9600",
    stopImported: true,
    pnlOverride: "65.04",
    pnlSource: "56.76",
    fxRateDate: "2026-09-23",
  };

  it("keeps every mark when the form is saved unchanged", () => {
    // The form sends numbers back as it parsed them, without the padding.
    expect(
      importMarksAfterEdit(imported, {
        stopPrice: "30205.96",
        pnlOverride: "65.04",
      }),
    ).toEqual({
      stopImported: true,
      pnlSource: "56.76",
      fxRateDate: "2026-09-23",
    });
  });

  it("clears the stop mark when the stop is moved", () => {
    expect(
      importMarksAfterEdit(imported, {
        stopPrice: "30210",
        pnlOverride: "65.04",
      }).stopImported,
    ).toBe(false);
  });

  it("clears the stop mark when the stop is removed", () => {
    expect(
      importMarksAfterEdit(imported, { stopPrice: null, pnlOverride: "65.04" })
        .stopImported,
    ).toBe(false);
  });

  it("ends the FX correction when the P&L is edited by hand", () => {
    expect(
      importMarksAfterEdit(imported, {
        stopPrice: "30205.96",
        pnlOverride: "60",
      }),
    ).toEqual({ stopImported: true, pnlSource: null, fxRateDate: null });
  });

  it("ends it too when the override is cleared", () => {
    expect(
      importMarksAfterEdit(imported, {
        stopPrice: "30205.96",
        pnlOverride: null,
      }).pnlSource,
    ).toBeNull();
  });

  it("never marks a stop the user typed as imported", () => {
    const manual = { ...imported, stopImported: false };
    expect(
      importMarksAfterEdit(manual, {
        stopPrice: "30205.96",
        pnlOverride: "65.04",
      }).stopImported,
    ).toBe(false);
  });
});

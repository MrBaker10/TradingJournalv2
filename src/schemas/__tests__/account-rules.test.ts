import { describe, expect, it } from "vitest";
import { accountRulesSchema } from "../account-rules.ts";

const valid = {
  programId: 3,
  evaluationStart: "2026-10-01",
  profitTarget: 3000,
  drawdownAmount: 2000,
  drawdownType: "eod_trailing",
  lockLevel: 50_100,
  dailyLossLimit: 1000,
  consistencyPercent: 50,
  minTradingDays: 5,
} as const;

function fieldErrors(input: unknown): Record<string, string> {
  const result = accountRulesSchema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.join("."), issue.message]),
  );
}

describe("accountRulesSchema", () => {
  it("accepts every rule, or only the required ones", () => {
    expect(fieldErrors(valid)).toEqual({});
    expect(
      fieldErrors({
        ...valid,
        drawdownType: "static",
        lockLevel: null,
        dailyLossLimit: null,
        consistencyPercent: null,
        minTradingDays: null,
      }),
    ).toEqual({});
  });

  it("reports a lock level on a static drawdown under the lock level field", () => {
    expect(fieldErrors({ ...valid, drawdownType: "static" })).toEqual({
      lockLevel: "validation.lockLevelType",
    });
  });

  it("names an empty required rule, and asks for a number when text is typed", () => {
    expect(
      fieldErrors({
        ...valid,
        profitTarget: undefined,
        drawdownAmount: undefined,
      }),
    ).toEqual({
      profitTarget: "validation.enterProfitTarget",
      drawdownAmount: "validation.enterMaxDrawdown",
    });
    expect(fieldErrors({ ...valid, profitTarget: Number.NaN })).toEqual({
      profitTarget: "validation.amountNumber",
    });
  });

  it("refuses empty amounts and out-of-range counts", () => {
    expect(
      fieldErrors({
        ...valid,
        profitTarget: 0,
        drawdownAmount: 12.345,
        consistencyPercent: 101,
        minTradingDays: 0,
      }),
    ).toEqual({
      profitTarget: "validation.amountAboveZero",
      drawdownAmount: "validation.twoDecimals",
      consistencyPercent: "validation.consistencyPercent",
      minTradingDays: "validation.daysAtLeastOne",
    });
  });
});

import { describe, expect, it } from "vitest";
import type { DimensionRow } from "../../../domain/analytics.ts";
import {
  dimensionName,
  formatMetric,
  formatR,
  formatShare,
} from "../format.ts";

const row: DimensionRow = {
  label: "Reversal",
  isNotSet: false,
  trades: 12,
  winRate: 0.5833,
  netPnlCents: -123456,
  avgR: 0.4,
  rCount: 9,
  barRatio: 1,
};

describe("formatR", () => {
  it("prints an R with its sign and two decimals", () => {
    expect(formatR(1.254)).toBe("+1.25R");
    expect(formatR(-0.5)).toBe("-0.50R");
    expect(formatR(0)).toBe("+0.00R");
  });

  it("prints a dash where there is no R", () => {
    expect(formatR(null)).toBe("—");
  });
});

describe("formatShare", () => {
  it("prints a whole percent, or a dash", () => {
    expect(formatShare(0.5833)).toBe("58%");
    expect(formatShare(null)).toBe("—");
  });
});

describe("dimensionName", () => {
  it("drops the leading By where the context already says it", () => {
    expect(dimensionName("By execution grade")).toBe("Execution grade");
    expect(dimensionName("By hour")).toBe("Hour");
  });
});

describe("formatMetric", () => {
  it("prints the figure of the switched metric", () => {
    expect(formatMetric(row, "pnl", "USD")).toBe("-$1,234.56");
    expect(formatMetric(row, "winRate", "USD")).toBe("58%");
    expect(formatMetric(row, "avgR", "USD")).toBe("+0.40R");
    expect(formatMetric(row, "trades", "USD")).toBe("12");
  });

  it("prints money in the display currency with its sign", () => {
    expect(formatMetric({ ...row, netPnlCents: 5000 }, "pnl", "EUR")).toBe(
      "+€50.00",
    );
  });
});

describe("interface language", () => {
  it("prints R, shares and metrics in German format", () => {
    expect(formatR(1.254, "de")).toBe("+1,25R");
    expect(formatShare(0.5833, "de")).toBe("58 %");
    expect(formatMetric(row, "pnl", "USD", "de")).toBe("-1.234,56 $");
    expect(formatMetric(row, "avgR", "USD", "de")).toBe("+0,40R");
  });
});

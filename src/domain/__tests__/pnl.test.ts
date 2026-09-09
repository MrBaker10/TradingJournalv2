import { describe, expect, it } from "vitest";
import { calculatePnl, type PnlInput } from "../pnl.ts";

const esLong: PnlInput = {
  direction: "long",
  entryPrice: 5000,
  exitPrice: 5010,
  contracts: 1,
  pointValue: 50,
};

describe("calculatePnl — direction", () => {
  it("computes a winning long trade", () => {
    const result = calculatePnl(esLong);
    expect(result.pnlCents).toBe(50000); // 10 points * $50 * 1 contract
  });

  it("computes a losing long trade", () => {
    const result = calculatePnl({ ...esLong, exitPrice: 4995 });
    expect(result.pnlCents).toBe(-25000); // -5 points * $50 * 1 contract
  });

  it("computes a winning short trade", () => {
    const result = calculatePnl({
      ...esLong,
      direction: "short",
      entryPrice: 5010,
      exitPrice: 5000,
    });
    expect(result.pnlCents).toBe(50000);
  });

  it("computes a losing short trade", () => {
    const result = calculatePnl({
      ...esLong,
      direction: "short",
      entryPrice: 5000,
      exitPrice: 5010,
    });
    expect(result.pnlCents).toBe(-50000);
  });

  it("scales with contract count", () => {
    const result = calculatePnl({ ...esLong, contracts: 3 });
    expect(result.pnlCents).toBe(150000);
  });
});

describe("calculatePnl — R multiple", () => {
  it("returns null when no stop price is given", () => {
    const result = calculatePnl(esLong);
    expect(result.rMultiple).toBeNull();
  });

  it("computes R multiple from initial risk", () => {
    // risk = |5000 - 4995| * 50 * 1 = $250 = 25000 cents, pnl = 50000 cents -> R = 2
    const result = calculatePnl({ ...esLong, stopPrice: 4995 });
    expect(result.rMultiple).toBe(2);
  });

  it("computes a negative R multiple for a losing trade", () => {
    const result = calculatePnl({
      ...esLong,
      exitPrice: 4990,
      stopPrice: 4995,
    });
    expect(result.rMultiple).toBe(-2);
  });

  it("returns null when the stop equals the entry (zero risk)", () => {
    const result = calculatePnl({ ...esLong, stopPrice: esLong.entryPrice });
    expect(result.rMultiple).toBeNull();
  });
});

describe("calculatePnl — override", () => {
  it("uses the override as the final P&L instead of the derived value", () => {
    const result = calculatePnl(esLong, 12345);
    expect(result.pnlCents).toBe(12345);
  });

  it("derives R multiple from the override, not the derived P&L", () => {
    // risk = 25000 cents, override pnl = 100000 cents -> R = 4
    const result = calculatePnl({ ...esLong, stopPrice: 4995 }, 100000);
    expect(result.rMultiple).toBe(4);
  });

  it("falls back to the derived value when no override is given", () => {
    const withOverride = calculatePnl(esLong, undefined);
    const withoutOverride = calculatePnl(esLong);
    expect(withOverride.pnlCents).toBe(withoutOverride.pnlCents);
  });
});

describe("calculatePnl — rounding via money.ts", () => {
  it("rounds fractional point captures to the nearest cent", () => {
    const result = calculatePnl({
      direction: "long",
      entryPrice: 5000,
      exitPrice: 5000.01,
      contracts: 1,
      pointValue: 20, // 0.01 * 20 = $0.20
    });
    expect(result.pnlCents).toBe(20);
  });
});

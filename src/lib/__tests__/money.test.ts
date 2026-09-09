import { describe, expect, it } from "vitest";
import { centsToDollars, dollarsToCents } from "../money.ts";

describe("dollarsToCents", () => {
  it("converts a whole dollar amount", () => {
    expect(dollarsToCents(50)).toBe(5000);
  });

  it("converts a fractional dollar amount", () => {
    expect(dollarsToCents(12.5)).toBe(1250);
  });

  it("rounds to the nearest cent", () => {
    expect(dollarsToCents(1.005)).toBe(101);
    expect(dollarsToCents(1.004)).toBe(100);
  });

  it("handles negative amounts", () => {
    expect(dollarsToCents(-12.5)).toBe(-1250);
  });

  it("handles zero", () => {
    expect(dollarsToCents(0)).toBe(0);
  });

  it("rejects a non-finite amount", () => {
    expect(() => dollarsToCents(Number.NaN)).toThrow(RangeError);
    expect(() => dollarsToCents(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe("centsToDollars", () => {
  it("converts whole cents back to dollars", () => {
    expect(centsToDollars(5000)).toBe(50);
  });

  it("converts fractional cents back to dollars", () => {
    expect(centsToDollars(1250)).toBe(12.5);
  });

  it("handles negative cents", () => {
    expect(centsToDollars(-1250)).toBe(-12.5);
  });

  it("rejects a non-integer cents value", () => {
    expect(() => centsToDollars(12.5)).toThrow(RangeError);
  });
});

describe("round trip", () => {
  it("recovers the original amount for values that already round to whole cents", () => {
    const amount = 1234.56;
    expect(centsToDollars(dollarsToCents(amount))).toBe(amount);
  });
});

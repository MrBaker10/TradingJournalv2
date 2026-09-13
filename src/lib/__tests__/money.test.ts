import { describe, expect, it } from "vitest";
import {
  centsToDollars,
  dollarsToCents,
  formatCents,
  formatCentsPlain,
} from "../money.ts";

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

describe("formatCents", () => {
  it("formats a positive amount with a thousands separator", () => {
    expect(formatCents(123456)).toBe("$1,234.56");
  });

  it("keeps the minus in front of the currency symbol", () => {
    expect(formatCents(-12000)).toBe("-$120.00");
  });

  it("adds an explicit plus only when asked and only for a gain", () => {
    expect(formatCents(30000, { signed: true })).toBe("+$300.00");
    expect(formatCents(-30000, { signed: true })).toBe("-$300.00");
    expect(formatCents(0, { signed: true })).toBe("$0.00");
  });

  it("rejects a non-integer cents value", () => {
    expect(() => formatCents(12.5)).toThrow(RangeError);
  });
});

describe("formatCentsPlain", () => {
  it("writes no thousands separator and no currency symbol", () => {
    expect(formatCentsPlain(123456)).toBe("1234.56");
  });

  it("keeps a leading minus", () => {
    expect(formatCentsPlain(-123456)).toBe("-1234.56");
  });

  it("pads a single-digit cents remainder", () => {
    expect(formatCentsPlain(1205)).toBe("12.05");
    expect(formatCentsPlain(-5)).toBe("-0.05");
  });

  it("always writes two decimals", () => {
    expect(formatCentsPlain(30000)).toBe("300.00");
    expect(formatCentsPlain(0)).toBe("0.00");
  });

  it("survives an amount past the float-precision comfort zone", () => {
    expect(formatCentsPlain(999999999999)).toBe("9999999999.99");
  });

  it("rejects a non-integer cents value", () => {
    expect(() => formatCentsPlain(12.5)).toThrow(RangeError);
  });
});

describe("round trip", () => {
  it("recovers the original amount for values that already round to whole cents", () => {
    const amount = 1234.56;
    expect(centsToDollars(dollarsToCents(amount))).toBe(amount);
  });
});

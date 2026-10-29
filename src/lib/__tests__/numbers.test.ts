import { describe, expect, it } from "vitest";
import {
  formatDecimalString,
  formatFixed,
  formatPercent,
  parseDecimalInput,
} from "../numbers.ts";

const NBSP = " ";

describe("formatDecimalString", () => {
  it("shows a stored price as stored in English", () => {
    expect(formatDecimalString("21234.50", "en")).toBe("21234.50");
  });

  it("swaps the decimal point for a comma in German, every digit kept", () => {
    expect(formatDecimalString("21234.50", "de")).toBe("21234,50");
    expect(formatDecimalString("1.08765", "de")).toBe("1,08765");
    expect(formatDecimalString("4500", "de")).toBe("4500");
  });

  it("writes a number's own digits with the language's separator", () => {
    expect(formatDecimalString(21234.5, "de")).toBe("21234,5");
    expect(formatDecimalString(21234.5, "en")).toBe("21234.5");
  });
});

describe("formatFixed", () => {
  it("writes a fixed number of decimals without grouping", () => {
    expect(formatFixed(1.25, 2, "en")).toBe("1.25");
    expect(formatFixed(1234.5, 1, "en")).toBe("1234.5");
    expect(formatFixed(-0.5, 2, "en")).toBe("-0.50");
  });

  it("writes the decimal comma in German", () => {
    expect(formatFixed(1.25, 2, "de")).toBe("1,25");
    expect(formatFixed(1234.5, 1, "de")).toBe("1234,5");
    expect(formatFixed(-0.5, 2, "de")).toBe("-0,50");
  });
});

describe("formatPercent", () => {
  it("writes a 0–1 share as a whole percent", () => {
    expect(formatPercent(0.456, "en")).toBe("46%");
    expect(formatPercent(1, "en")).toBe("100%");
  });

  it("puts a space before the sign in German", () => {
    expect(formatPercent(0.456, "de")).toBe(`46${NBSP}%`);
    expect(formatPercent(0, "de")).toBe(`0${NBSP}%`);
  });
});

describe("parseDecimalInput", () => {
  it("reads a comma or a dot as the decimal separator", () => {
    expect(parseDecimalInput("21234,50")).toBe(21234.5);
    expect(parseDecimalInput("21240.25")).toBe(21240.25);
    expect(parseDecimalInput(" 0,8 ")).toBe(0.8);
    expect(parseDecimalInput("-12,5")).toBe(-12.5);
    expect(parseDecimalInput("4500")).toBe(4500);
  });

  it("reads one separator as a decimal, never as thousands", () => {
    expect(parseDecimalInput("1.234")).toBe(1.234);
    expect(parseDecimalInput("1,234")).toBe(1.234);
  });

  it("refuses a thousands separator", () => {
    expect(parseDecimalInput("1.234,5")).toBeNaN();
    expect(parseDecimalInput("1,234.5")).toBeNaN();
    expect(parseDecimalInput("1 234,5")).toBeNaN();
    expect(parseDecimalInput("1.234.567")).toBeNaN();
  });

  it("refuses what is not a decimal", () => {
    expect(parseDecimalInput("abc")).toBeNaN();
    expect(parseDecimalInput("1e3")).toBeNaN();
    expect(parseDecimalInput(",")).toBeNaN();
  });

  it("reads an empty field as no value", () => {
    expect(parseDecimalInput("")).toBeUndefined();
    expect(parseDecimalInput("   ")).toBeUndefined();
  });
});

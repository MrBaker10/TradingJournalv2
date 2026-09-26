import { describe, expect, it } from "vitest";
import { parseRates } from "../frankfurter.ts";

// Verbatim from /v2/rates?base=EUR&quotes=USD&providers=ecb, 2026-09-17..22.
const response = [
  { date: "2026-09-17", base: "EUR", quote: "USD", rate: 1.1481 },
  { date: "2026-09-18", base: "EUR", quote: "USD", rate: 1.146 },
  { date: "2026-09-21", base: "EUR", quote: "USD", rate: 1.149 },
  { date: "2026-09-22", base: "EUR", quote: "USD", rate: 1.1463 },
];

describe("parseRates", () => {
  it("reads the rate list as decimal strings", () => {
    expect(parseRates(response, "EUR")).toEqual([
      { date: "2026-09-17", rateVsUsd: "1.1481" },
      { date: "2026-09-18", rateVsUsd: "1.146" },
      { date: "2026-09-21", rateVsUsd: "1.149" },
      { date: "2026-09-22", rateVsUsd: "1.1463" },
    ]);
  });

  it("reads an empty range as no rates", () => {
    expect(parseRates([], "EUR")).toEqual([]);
  });

  it("rejects a body that is not a list", () => {
    expect(() => parseRates({ rates: {} }, "EUR")).toThrow(/not a list/);
  });

  it("crosses another currency through the euro", () => {
    // Verbatim from /v2/rates?base=EUR&quotes=USD,JPY&providers=ecb, 2026-09-24..25.
    const crossed = [
      { date: "2026-09-24", base: "EUR", quote: "JPY", rate: 180.57 },
      { date: "2026-09-24", base: "EUR", quote: "USD", rate: 1.1367 },
      { date: "2026-09-25", base: "EUR", quote: "JPY", rate: 179.7 },
      { date: "2026-09-25", base: "EUR", quote: "USD", rate: 1.1403 },
    ];
    expect(parseRates(crossed, "JPY")).toEqual([
      { date: "2026-09-24", rateVsUsd: "0.0062950656" },
      { date: "2026-09-25", rateVsUsd: "0.006345576" },
    ]);
  });

  it("rejects a crossed day that lacks one of its quotes", () => {
    const partial = [
      { date: "2026-09-24", base: "EUR", quote: "USD", rate: 1.1367 },
    ];
    expect(() => parseRates(partial, "JPY")).toThrow(/2026-09-24/);
  });

  it("rejects a quote for another currency", () => {
    const wrong = [
      { date: "2026-09-24", base: "EUR", quote: "GBP", rate: 0.85 },
    ];
    expect(() => parseRates(wrong, "JPY")).toThrow(/row 1/);
    expect(() => parseRates(wrong, "EUR")).toThrow(/row 1/);
  });

  it("rejects the inverse pair", () => {
    const inverted = [{ ...response[0], base: "USD", quote: "EUR" }];
    expect(() => parseRates(inverted, "EUR")).toThrow(/row 1/);
  });

  it("rejects a missing, zero or non-numeric rate", () => {
    for (const rate of [undefined, 0, -1, "1.14", Number.NaN]) {
      expect(() => parseRates([{ ...response[0], rate }], "EUR")).toThrow(
        /row 1/,
      );
    }
  });

  it("rejects a malformed date", () => {
    expect(() =>
      parseRates([{ ...response[0], date: "18.09.2026" }], "EUR"),
    ).toThrow(/row 1/);
  });

  it("names the row that failed", () => {
    expect(() => parseRates([response[0], null], "EUR")).toThrow(/row 2/);
  });
});

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

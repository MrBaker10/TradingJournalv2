import { describe, expect, it } from "vitest";
import { RATE_SCALE, toScaledRate } from "../rate.ts";

describe("toScaledRate", () => {
  it("scales a rate to ten decimals exactly", () => {
    expect(toScaledRate("1.1403")).toBe(BigInt(11_403_000_000));
    expect(toScaledRate("0.0062950656")).toBe(BigInt(62_950_656));
    expect(toScaledRate("2")).toBe(RATE_SCALE * BigInt(2));
  });

  it("accepts the ten padded decimals numeric(18,10) returns", () => {
    expect(toScaledRate("1.1403000000")).toBe(toScaledRate("1.1403"));
  });

  it("rejects an eleventh decimal, zero and anything not a positive decimal", () => {
    for (const rate of ["0.00629506561", "0", "0.0", "-1.1", "1,14", ""]) {
      expect(() => toScaledRate(rate)).toThrow(RangeError);
    }
  });
});

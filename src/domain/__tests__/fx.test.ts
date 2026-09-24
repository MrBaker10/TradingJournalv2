import { describe, expect, it } from "vitest";
import {
  datesNeedingFetch,
  type FxRate,
  rateFor,
  shiftDate,
  toUsdCents,
} from "../fx.ts";

describe("toUsdCents", () => {
  it("converts with the rate as a decimal string", () => {
    // 56.76 EUR at 1.146 USD per EUR = 65.04696 USD
    expect(toUsdCents(5676, "1.146")).toBe(6505);
  });

  it("rounds half away from zero, symmetric for gains and losses", () => {
    expect(toUsdCents(1, "1.5")).toBe(2);
    expect(toUsdCents(-1, "1.5")).toBe(-2);
    expect(toUsdCents(1, "1.49")).toBe(1);
    expect(toUsdCents(-1, "1.49")).toBe(-1);
  });

  it("is exact where a float would drift", () => {
    // 0.1 + 0.2 territory: 3 cents at 1.1 = 3.3 cents, never 3.3000000000000003
    expect(toUsdCents(3, "1.1")).toBe(3);
    expect(toUsdCents(123_456_789, "1.000001")).toBe(123_456_912);
  });

  it("keeps zero at zero", () => {
    expect(toUsdCents(0, "1.146")).toBe(0);
  });

  it("accepts six decimals and rejects a seventh", () => {
    expect(toUsdCents(1_000_000, "1.123456")).toBe(1_123_456);
    expect(() => toUsdCents(100, "1.1234567")).toThrow(RangeError);
  });

  it("rejects a rate that is not a positive decimal", () => {
    expect(() => toUsdCents(100, "0")).toThrow(RangeError);
    expect(() => toUsdCents(100, "-1.1")).toThrow(RangeError);
    expect(() => toUsdCents(100, "1,146")).toThrow(RangeError);
    expect(() => toUsdCents(100, "")).toThrow(RangeError);
  });

  it("rejects fractional cents", () => {
    expect(() => toUsdCents(1.5, "1.146")).toThrow(RangeError);
  });
});

describe("shiftDate", () => {
  it("crosses month and year boundaries", () => {
    expect(shiftDate("2026-09-30", 1)).toBe("2026-10-01");
    expect(shiftDate("2027-01-01", -1)).toBe("2026-12-31");
    expect(shiftDate("2028-03-01", -1)).toBe("2028-02-29");
  });

  it("rejects a malformed date", () => {
    expect(() => shiftDate("2026-9-1", 1)).toThrow(RangeError);
  });
});

// ECB reference rates for the week of 2026-09-18, as the source returned them:
// Friday, then Monday and Tuesday — nothing on the weekend.
const week: FxRate[] = [
  { date: "2026-09-17", rateVsUsd: "1.1481" },
  { date: "2026-09-18", rateVsUsd: "1.146" },
  { date: "2026-09-21", rateVsUsd: "1.149" },
  { date: "2026-09-22", rateVsUsd: "1.1463" },
];

describe("rateFor", () => {
  it("takes the day's own rate", () => {
    expect(rateFor("2026-09-21", week)).toBe("1.149");
  });

  it("gives a Saturday and a Sunday Friday's rate", () => {
    expect(rateFor("2026-09-19", week)).toBe("1.146");
    expect(rateFor("2026-09-20", week)).toBe("1.146");
  });

  it("never looks forward", () => {
    expect(rateFor("2026-09-16", week)).toBeNull();
  });

  it("gives up after seven days", () => {
    expect(rateFor("2026-09-29", week)).toBe("1.1463");
    expect(rateFor("2026-09-30", week)).toBeNull();
  });

  it("does not depend on the order rates arrive in", () => {
    expect(rateFor("2026-09-20", [...week].reverse())).toBe("1.146");
  });
});

describe("datesNeedingFetch", () => {
  const stored = week.map((rate) => rate.date);

  it("needs nothing for days the stored set settles, weekend included", () => {
    expect(
      datesNeedingFetch(["2026-09-18", "2026-09-19", "2026-09-21"], stored),
    ).toEqual([]);
  });

  it("needs a day after the last stored rate, even when rateFor would answer", () => {
    // rateFor("2026-09-23") returns Tuesday's rate — but Wednesday's simply
    // has not been fetched yet.
    expect(rateFor("2026-09-23", week)).toBe("1.1463");
    expect(datesNeedingFetch(["2026-09-23"], stored)).toEqual(["2026-09-23"]);
  });

  it("needs a day before the first stored rate", () => {
    expect(datesNeedingFetch(["2026-09-10"], stored)).toEqual(["2026-09-10"]);
  });

  it("needs everything when nothing is stored", () => {
    expect(datesNeedingFetch(["2026-09-18"], [])).toEqual(["2026-09-18"]);
  });

  it("returns each date once, sorted", () => {
    expect(
      datesNeedingFetch(["2026-09-24", "2026-09-10", "2026-09-24"], stored),
    ).toEqual(["2026-09-10", "2026-09-24"]);
  });
});

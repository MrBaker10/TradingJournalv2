import { describe, expect, it } from "vitest";
import {
  convertForTrade,
  correctionFor,
  datesNeedingFetch,
  displayCurrencyFor,
  type FxRate,
  finalRateFor,
  isProvisional,
  rateFor,
  shiftDate,
  toAccountCents,
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

// Wed 23, Thu 24, Fri 25 Sep 2026; Sat 26 and Sun 27 have no rate.
const lateWeek: FxRate[] = [
  { date: "2026-09-23", rateVsUsd: "1.15" },
  { date: "2026-09-24", rateVsUsd: "1.16" },
  { date: "2026-09-25", rateVsUsd: "1.17" },
];
const monday: FxRate = { date: "2026-09-28", rateVsUsd: "1.18" };

describe("finalRateFor", () => {
  it("is the day's own rate once it is stored", () => {
    expect(finalRateFor("2026-09-24", lateWeek)).toEqual(lateWeek[1]);
  });

  it("is not known while the trade date has no rate on or after it", () => {
    expect(finalRateFor("2026-09-24", lateWeek.slice(0, 1))).toBeNull();
  });

  it("settles a weekend day on Friday once Monday is stored", () => {
    expect(finalRateFor("2026-09-26", lateWeek)).toBeNull();
    expect(finalRateFor("2026-09-26", [...lateWeek, monday])).toEqual(
      lateWeek[2],
    );
  });

  it("is null when nothing lies within the lookback", () => {
    expect(finalRateFor("2026-09-24", [monday])).toBeNull();
  });
});

describe("isProvisional", () => {
  it("is pending while the day's rate is not published yet", () => {
    // Imported Thursday morning with Wednesday's rate.
    expect(
      isProvisional("2026-09-23", "2026-09-24", lateWeek.slice(0, 1)),
    ).toBe(true);
  });

  it("stays pending after publication until the amount is converted again", () => {
    expect(isProvisional("2026-09-23", "2026-09-24", lateWeek)).toBe(true);
  });

  it("is settled once converted with the day's own rate", () => {
    expect(isProvisional("2026-09-24", "2026-09-24", lateWeek)).toBe(false);
  });

  it("settles a Saturday trade on Friday's rate once Monday is stored", () => {
    expect(isProvisional("2026-09-25", "2026-09-26", lateWeek)).toBe(true);
    expect(
      isProvisional("2026-09-25", "2026-09-26", [...lateWeek, monday]),
    ).toBe(false);
  });

  it("has nothing pending without a rate date", () => {
    expect(isProvisional(null, "2026-09-24", [])).toBe(false);
  });

  it("rejects a malformed date", () => {
    expect(() => isProvisional("24.09.2026", "2026-09-24", lateWeek)).toThrow(
      RangeError,
    );
  });
});

describe("convertForTrade", () => {
  it("converts with the day's own rate and is final", () => {
    expect(convertForTrade(5676, "2026-09-24", lateWeek)).toEqual({
      usdCents: 6584, // 56.76 * 1.16 = 65.8416
      rateDate: "2026-09-24",
      provisional: false,
    });
  });

  it("borrows the latest rate before publication and says it is provisional", () => {
    expect(convertForTrade(5676, "2026-09-24", lateWeek.slice(0, 1))).toEqual({
      usdCents: 6527, // 56.76 * 1.15 = 65.274
      rateDate: "2026-09-23",
      provisional: true,
    });
  });

  it("has nothing to convert with when no rate is close enough", () => {
    expect(convertForTrade(5676, "2026-09-24", [])).toBeNull();
  });
});

describe("correctionFor", () => {
  it("re-converts once the day's rate is published", () => {
    expect(correctionFor(5676, "2026-09-23", "2026-09-24", lateWeek)).toEqual({
      usdCents: 6584,
      rateDate: "2026-09-24",
    });
  });

  it("waits while the final rate is not known", () => {
    expect(
      correctionFor(5676, "2026-09-23", "2026-09-24", lateWeek.slice(0, 1)),
    ).toBeNull();
  });

  it("leaves a trade alone that already has its final rate", () => {
    expect(
      correctionFor(5676, "2026-09-25", "2026-09-26", [...lateWeek, monday]),
    ).toBeNull();
  });

  it("keeps a loss a loss", () => {
    expect(
      correctionFor(-2827, "2026-09-23", "2026-09-24", lateWeek)?.usdCents,
    ).toBe(-3279); // -28.27 * 1.16 = -32.7932
  });
});

describe("displayCurrencyFor", () => {
  it("shows the one currency every account shares", () => {
    expect(displayCurrencyFor(["EUR"])).toBe("EUR");
    expect(displayCurrencyFor(["EUR", "EUR"])).toBe("EUR");
    expect(displayCurrencyFor(["USD", "USD"])).toBe("USD");
  });

  it("falls back to USD for a mix", () => {
    expect(displayCurrencyFor(["EUR", "USD"])).toBe("USD");
    expect(displayCurrencyFor(["USD", "EUR", "EUR"])).toBe("USD");
  });

  it("is USD without any account", () => {
    expect(displayCurrencyFor([])).toBe("USD");
  });
});

describe("toAccountCents", () => {
  it("converts USD cents back with the rate", () => {
    // 65.05 USD at 1.146 USD per EUR = 56.7626... EUR
    expect(toAccountCents(6505, "1.146")).toBe(5676);
  });

  it("round-trips an import's own conversion", () => {
    const usd = toUsdCents(5676, "1.146");
    expect(toAccountCents(usd, "1.146")).toBe(5676);
  });

  it("rounds half away from zero, symmetric for gains and losses", () => {
    // 3 cents at 2.0 = 1.5 cents
    expect(toAccountCents(3, "2")).toBe(2);
    expect(toAccountCents(-3, "2")).toBe(-2);
    expect(toAccountCents(1, "4")).toBe(0);
  });

  it("rejects fractional cents", () => {
    expect(() => toAccountCents(1.5, "1.1")).toThrow(RangeError);
  });
});

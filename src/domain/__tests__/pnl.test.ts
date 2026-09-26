import { describe, expect, it } from "vitest";
import { calculatePnl, calculateUsdPnl, type PnlInput } from "../pnl.ts";

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

describe("calculatePnl — fractional quantities", () => {
  const us100: PnlInput = {
    direction: "short",
    entryPrice: 30191.72,
    exitPrice: 30187.38,
    contracts: 15,
    pointValue: 1,
  };

  it("prices a CFD trade in lots from the FTMO sample", () => {
    // 4.34 points * $1 * 15 lots = $65.10
    expect(calculatePnl(us100).pnlCents).toBe(6510);
  });

  it("takes a quantity with decimals", () => {
    // 0.65 points * $1 * 7.56 lots = $4.914 -> 491 cents
    const result = calculatePnl({
      direction: "long",
      entryPrice: 30203.38,
      exitPrice: 30204.03,
      contracts: 7.56,
      pointValue: 1,
    });
    expect(result.pnlCents).toBe(491);
  });

  it("scales gold with a point value of 100 per lot", () => {
    // 5.7 points * $100 * 0.05 lots = $28.50
    const result = calculatePnl({
      direction: "long",
      entryPrice: 3700,
      exitPrice: 3705.7,
      contracts: 0.05,
      pointValue: 100,
    });
    expect(result.pnlCents).toBe(2850);
  });

  it("keeps R independent of the quantity", () => {
    const base = { ...us100, stopPrice: 30205.96 };
    const one = calculatePnl({ ...base, contracts: 1 }).rMultiple;
    const many = calculatePnl({ ...base, contracts: 1.88 }).rMultiple;
    expect(many).toBeCloseTo(one ?? Number.NaN, 2);
  });

  it("stays exact where a float product would lose digits", () => {
    // 50000 points * $100 * 9999.9999 lots: far beyond 2^53 at PRICE_SCALE^3.
    const result = calculatePnl({
      direction: "long",
      entryPrice: 10000,
      exitPrice: 60000,
      contracts: 9999.9999,
      pointValue: 100,
    });
    expect(result.pnlCents).toBe(4_999_999_950_000);
  });

  it("matches whole-number quantities for every count and a range of moves", () => {
    for (let contracts = 1; contracts <= 20; contracts += 1) {
      for (let ticks = -40; ticks <= 40; ticks += 1) {
        const move = ticks * 0.25;
        const result = calculatePnl({
          direction: "long",
          entryPrice: 20000,
          exitPrice: 20000 + move,
          contracts,
          pointValue: 2,
        });
        // Every quarter point on MNQ is 50 cents, times the count.
        expect(result.pnlCents).toBe(ticks * 50 * contracts);
      }
    }
  });

  it("is linear in the quantity for fractional lots", () => {
    for (let hundredths = 1; hundredths <= 500; hundredths += 7) {
      const lots = hundredths / 100;
      const result = calculatePnl({
        direction: "long",
        entryPrice: 100,
        exitPrice: 101,
        contracts: lots,
        pointValue: 100,
      });
      // One point on a $100 lot is $100 per lot = 100 cents per hundredth.
      expect(result.pnlCents).toBe(hundredths * 100);
    }
  });

  it("rounds a negative half cent towards +infinity, like Math.round", () => {
    // -0.0001 points * $50 * 1 contract = -$0.005, which rounds to 0 cents.
    const result = calculatePnl({
      direction: "long",
      entryPrice: 100.0001,
      exitPrice: 100,
      contracts: 1,
      pointValue: 50,
    });
    expect(result.pnlCents + 0).toBe(0);
  });
});

describe("calculatePnl — five decimals and profit currency", () => {
  it("prices EURUSD at five decimals", () => {
    // 0.00100 * 100,000 per lot * 1 lot = $100.00
    const result = calculatePnl({
      direction: "long",
      entryPrice: 1.08453,
      exitPrice: 1.08553,
      contracts: 1,
      pointValue: 100_000,
    });
    expect(result.pnlCents).toBe(10000);
  });

  it("keeps the fifth decimal a float would blur", () => {
    // 0.00001 * 100,000 * 0.01 lots = $0.01 — one pipette on a micro lot
    const result = calculatePnl({
      direction: "short",
      entryPrice: 1.23457,
      exitPrice: 1.23456,
      contracts: 0.01,
      pointValue: 100_000,
    });
    expect(result.pnlCents).toBe(1);
  });

  it("converts a yen P&L with the rate of the trade date", () => {
    // 0.5 * 100,000 = ¥50,000 at 0.0062950656 USD per JPY = $314.75328
    const result = calculatePnl({
      direction: "long",
      entryPrice: 157.1,
      exitPrice: 157.6,
      contracts: 1,
      pointValue: 100_000,
      profitRateVsUsd: "0.0062950656",
    });
    expect(result.pnlCents).toBe(31475);
  });

  it("converts a euro index CFD", () => {
    // GER40.cash short 10.25 points * €1 = €10.25 at 1.1403 = $11.688075
    const result = calculatePnl({
      direction: "short",
      entryPrice: 24000.5,
      exitPrice: 23990.25,
      contracts: 1,
      pointValue: 1,
      profitRateVsUsd: "1.1403",
    });
    expect(result.pnlCents).toBe(1169);
  });

  it("rounds once, after converting, halves towards +infinity", () => {
    // ¥1 at 0.005 = half a cent
    const base: PnlInput = {
      direction: "long",
      entryPrice: 100,
      exitPrice: 100.001,
      contracts: 1,
      pointValue: 1000,
      profitRateVsUsd: "0.005",
    };
    expect(calculatePnl(base).pnlCents).toBe(1);
    expect(calculatePnl({ ...base, direction: "short" }).pnlCents).toBe(0);
  });

  it("never converts the override, which is USD already", () => {
    const result = calculatePnl(
      {
        direction: "long",
        entryPrice: 157.1,
        exitPrice: 157.6,
        contracts: 1,
        pointValue: 100_000,
        profitRateVsUsd: "0.0062950656",
      },
      12345,
    );
    expect(result.pnlCents).toBe(12345);
  });

  it("keeps R the same in any currency", () => {
    const base: PnlInput = {
      direction: "long",
      entryPrice: 157.1,
      exitPrice: 157.6,
      stopPrice: 156.85,
      contracts: 1,
      pointValue: 100_000,
    };
    const converted = calculatePnl({ ...base, profitRateVsUsd: "0.0063" });
    expect(calculatePnl(base).rMultiple).toBe(2);
    expect(converted.rMultiple).toBe(2);
  });

  it("rejects a rate with more than ten decimals", () => {
    expect(() =>
      calculatePnl({ ...esLong, profitRateVsUsd: "0.00629506561" }),
    ).toThrow(RangeError);
  });
});

describe("calculateUsdPnl", () => {
  const yen = {
    direction: "long" as const,
    entryPrice: 157.1,
    exitPrice: 157.6,
    stopPrice: 156.85,
    contracts: 1,
    pointValue: 100_000,
  };

  it("converts with the stored rate", () => {
    const result = calculateUsdPnl({
      ...yen,
      profitCurrency: "JPY",
      profitRateVsUsd: "0.0062950656",
    });
    // P&L and risk are each rounded to the cent after converting.
    expect(result.pnlCents).toBe(31475);
    expect(result.rMultiple).toBeCloseTo(2, 3);
  });

  it("has no USD amount without a rate, but keeps R", () => {
    const result = calculateUsdPnl({
      ...yen,
      profitCurrency: "JPY",
      profitRateVsUsd: null,
    });
    expect(result).toEqual({ pnlCents: null, rMultiple: 2 });
  });

  it("still takes a USD override without a rate", () => {
    const result = calculateUsdPnl(
      { ...yen, profitCurrency: "JPY", profitRateVsUsd: null },
      12345,
    );
    expect(result.pnlCents).toBe(12345);
  });

  it("ignores any rate for a USD instrument", () => {
    const result = calculateUsdPnl({
      ...esLong,
      profitCurrency: "USD",
      profitRateVsUsd: null,
    });
    expect(result.pnlCents).toBe(50000);
  });
});

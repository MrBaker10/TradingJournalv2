import { describe, expect, it } from "vitest";
import {
  evaluateRules,
  type RuleStatusInput,
  toRuleTradingDay,
} from "../rule-status.ts";

// $50,000 account, $2,000 static drawdown: the floor sits at $48,000 and
// "close" starts at $400 above it.
function input(overrides: Partial<RuleStatusInput> = {}): RuleStatusInput {
  return {
    rules: {
      profitTargetCents: 300_000,
      drawdownAmountCents: 200_000,
      drawdownType: "static",
      lockLevelCents: null,
      dailyLossLimitCents: null,
      consistencyPercent: null,
      minTradingDays: 5,
    },
    startingBalanceCents: 5_000_000,
    days: [],
    payouts: [],
    today: "2026-10-19",
    ...overrides,
  };
}

describe("evaluateRules — static drawdown", () => {
  it("is ok while the balance stays well above the floor", () => {
    const status = evaluateRules(
      input({
        days: [
          { tradingDay: "2026-10-12", netCents: -50_000 },
          { tradingDay: "2026-10-13", netCents: 20_000 },
        ],
      }),
    );
    expect(status.drawdown).toEqual({
      status: "ok",
      floorCents: 4_800_000,
      balanceCents: 4_970_000,
      distanceCents: 170_000,
    });
  });

  it("turns close exactly at 20 % of the drawdown amount left", () => {
    const at = evaluateRules(
      input({ days: [{ tradingDay: "2026-10-12", netCents: -160_000 }] }),
    );
    const above = evaluateRules(
      input({ days: [{ tradingDay: "2026-10-12", netCents: -159_999 }] }),
    );
    expect(at.drawdown).toMatchObject({
      status: "close",
      distanceCents: 40_000,
    });
    expect(above.drawdown).toMatchObject({
      status: "ok",
      distanceCents: 40_001,
    });
  });

  it("is breached once a day ends on the floor", () => {
    const status = evaluateRules(
      input({ days: [{ tradingDay: "2026-10-12", netCents: -200_000 }] }),
    );
    expect(status.drawdown).toMatchObject({
      status: "breached",
      distanceCents: 0,
    });
  });

  it("stays breached after the balance recovers above the floor", () => {
    const status = evaluateRules(
      input({
        days: [
          { tradingDay: "2026-10-12", netCents: -250_000 },
          { tradingDay: "2026-10-13", netCents: 300_000 },
        ],
      }),
    );
    expect(status.drawdown).toEqual({
      status: "breached",
      floorCents: 4_800_000,
      balanceCents: 5_050_000,
      distanceCents: 250_000,
    });
  });
});

describe("evaluateRules — EOD trailing drawdown", () => {
  const eod = (
    overrides: Partial<RuleStatusInput> = {},
    lockLevelCents: number | null = null,
  ) =>
    input({
      ...overrides,
      rules: { ...input().rules, drawdownType: "eod_trailing", lockLevelCents },
    });

  it("raises the floor with each new end-of-day high and holds it through a losing day", () => {
    const status = evaluateRules(
      eod({
        days: [
          { tradingDay: "2026-10-12", netCents: 100_000 }, // high $51,000
          { tradingDay: "2026-10-13", netCents: -50_000 }, // $50,500, no new high
          { tradingDay: "2026-10-14", netCents: 80_000 }, // high $51,300
          { tradingDay: "2026-10-15", netCents: -60_000 }, // $50,700
        ],
      }),
    );
    expect(status.drawdown).toEqual({
      status: "ok",
      floorCents: 4_930_000, // $51,300 − $2,000
      balanceCents: 5_070_000,
      distanceCents: 140_000,
    });
  });

  it("is breached when a close reaches the floor raised by an earlier high, and stays so", () => {
    const status = evaluateRules(
      eod({
        days: [
          { tradingDay: "2026-10-12", netCents: 150_000 }, // high $51,500, floor $49,500
          { tradingDay: "2026-10-13", netCents: -200_000 }, // $49,500 on the floor
          { tradingDay: "2026-10-14", netCents: 100_000 }, // back to $50,500
        ],
      }),
    );
    expect(status.drawdown).toEqual({
      status: "breached",
      floorCents: 4_950_000,
      balanceCents: 5_050_000,
      distanceCents: 100_000,
    });
  });

  it("turns close exactly at 20 % of the drawdown amount above the trailed floor", () => {
    const days = (lossCents: number) => [
      { tradingDay: "2026-10-12", netCents: 100_000 }, // floor $49,000
      { tradingDay: "2026-10-13", netCents: -lossCents },
    ];
    expect(evaluateRules(eod({ days: days(160_000) })).drawdown).toMatchObject({
      status: "close",
      distanceCents: 40_000,
    });
    expect(evaluateRules(eod({ days: days(159_999) })).drawdown).toMatchObject({
      status: "ok",
      distanceCents: 40_001,
    });
  });

  it("stops the floor at the lock level", () => {
    const status = evaluateRules(
      eod(
        {
          days: [
            { tradingDay: "2026-10-12", netCents: 150_000 }, // floor would be $49,500
            { tradingDay: "2026-10-13", netCents: 250_000 }, // floor would be $52,000
          ],
        },
        5_010_000, // locks at $50,100
      ),
    );
    expect(status.drawdown).toEqual({
      status: "ok",
      floorCents: 5_010_000,
      balanceCents: 5_400_000,
      distanceCents: 390_000,
    });
  });

  it("is breached when a close lands exactly on a floor the lock level holds", () => {
    const status = evaluateRules(
      eod(
        {
          days: [
            { tradingDay: "2026-10-12", netCents: 100_000 }, // trailed $49,000, locked $48,500
            { tradingDay: "2026-10-13", netCents: -250_000 }, // $48,500 on the floor
          ],
        },
        4_850_000,
      ),
    );
    expect(status.drawdown).toEqual({
      status: "breached",
      floorCents: 4_850_000,
      balanceCents: 4_850_000,
      distanceCents: 0,
    });
  });

  it("never lowers the floor below where it stands, even with a lock level under it", () => {
    const status = evaluateRules(
      eod(
        { days: [{ tradingDay: "2026-10-12", netCents: 10_000 }] }, // high $50,100
        4_700_000, // locks at $47,000, below the starting floor of $48,000
      ),
    );
    expect(status.drawdown).toMatchObject({ floorCents: 4_800_000 });
  });
});

describe("evaluateRules — intraday trailing drawdown", () => {
  it("is not checkable and shows no floor, whatever the days did", () => {
    const status = evaluateRules(
      input({
        rules: { ...input().rules, drawdownType: "intraday_trailing" },
        days: [{ tradingDay: "2026-10-12", netCents: -300_000 }],
      }),
    );
    expect(status.drawdown).toEqual({ status: "not_checkable" });
  });
});

describe("evaluateRules — daily loss limit", () => {
  // $1,000 limit; today is Monday 19 October.
  const daily = (days: RuleStatusInput["days"]) =>
    input({ rules: { ...input().rules, dailyLossLimitCents: 100_000 }, days });

  it("measures only today's trading day; earlier losses never count", () => {
    const status = evaluateRules(
      daily([
        { tradingDay: "2026-10-16", netCents: -500_000 },
        { tradingDay: "2026-10-19", netCents: -30_000 },
      ]),
    );
    expect(status.dailyLoss).toEqual({
      status: "ok",
      todayNetCents: -30_000,
      limitCents: 100_000,
      distanceCents: 70_000,
    });
  });

  it("turns close exactly at 20 % of the limit left", () => {
    const today = (netCents: number) =>
      evaluateRules(daily([{ tradingDay: "2026-10-19", netCents }])).dailyLoss;
    expect(today(-80_000)).toMatchObject({
      status: "close",
      distanceCents: 20_000,
    });
    expect(today(-79_999)).toMatchObject({
      status: "ok",
      distanceCents: 20_001,
    });
  });

  it("is breached once today's loss reaches the limit", () => {
    const status = evaluateRules(
      daily([{ tradingDay: "2026-10-19", netCents: -100_000 }]),
    );
    expect(status.dailyLoss).toMatchObject({
      status: "breached",
      distanceCents: 0,
    });
  });

  it("widens the room by today's profit so far", () => {
    expect(
      evaluateRules(daily([{ tradingDay: "2026-10-19", netCents: 30_000 }]))
        .dailyLoss,
    ).toEqual({
      status: "ok",
      todayNetCents: 30_000,
      limitCents: 100_000,
      distanceCents: 130_000,
    });
  });

  it("is ok with a full limit when today has no trade yet, and not set without a limit", () => {
    expect(
      evaluateRules(daily([{ tradingDay: "2026-10-16", netCents: -99_000 }]))
        .dailyLoss,
    ).toEqual({
      status: "ok",
      todayNetCents: 0,
      limitCents: 100_000,
      distanceCents: 100_000,
    });
    expect(evaluateRules(input()).dailyLoss).toEqual({ status: "not_set" });
  });
});

describe("evaluateRules — consistency", () => {
  // 50 % limit: no single day may hold more than half of total profit.
  const consistency = (days: RuleStatusInput["days"]) =>
    evaluateRules(
      input({ rules: { ...input().rules, consistencyPercent: 50 }, days }),
    ).consistency;
  it("compares the best day's share of total profit with the limit", () => {
    expect(
      consistency([
        { tradingDay: "2026-10-12", netCents: 40_000 },
        { tradingDay: "2026-10-13", netCents: 35_000 },
        { tradingDay: "2026-10-14", netCents: 25_000 },
      ]),
    ).toEqual({
      status: "ok",
      checked: true,
      bestDayCents: 40_000,
      totalProfitCents: 100_000,
      shareTenthsPercent: 400,
      limitPercent: 50,
    });
  });

  it("turns close exactly 5 points under the limit", () => {
    expect(
      consistency([
        { tradingDay: "2026-10-12", netCents: 45_000 },
        { tradingDay: "2026-10-13", netCents: 30_000 },
        { tradingDay: "2026-10-14", netCents: 25_000 },
      ]),
    ).toMatchObject({ status: "close", bestDayCents: 45_000 });
    expect(
      consistency([
        { tradingDay: "2026-10-12", netCents: 44_999 },
        { tradingDay: "2026-10-13", netCents: 30_001 },
        { tradingDay: "2026-10-14", netCents: 25_000 },
      ]),
    ).toMatchObject({ status: "ok", bestDayCents: 44_999 });
  });

  it("allows exactly the limit and is breached above it", () => {
    expect(
      consistency([
        { tradingDay: "2026-10-12", netCents: 50_000 },
        { tradingDay: "2026-10-13", netCents: 30_000 },
        { tradingDay: "2026-10-14", netCents: 20_000 },
      ]),
    ).toMatchObject({ status: "close", bestDayCents: 50_000 });
    expect(
      consistency([
        { tradingDay: "2026-10-12", netCents: 50_001 },
        { tradingDay: "2026-10-13", netCents: 29_999 },
        { tradingDay: "2026-10-14", netCents: 20_000 },
      ]),
    ).toMatchObject({ status: "breached", bestDayCents: 50_001 });
  });

  it("is skipped while total profit is zero or negative, and not set without a limit", () => {
    expect(
      consistency([
        { tradingDay: "2026-10-12", netCents: 40_000 },
        { tradingDay: "2026-10-13", netCents: -40_000 },
      ]),
    ).toEqual({
      status: "ok",
      checked: false,
      totalProfitCents: 0,
      limitPercent: 50,
    });
    expect(
      consistency([{ tradingDay: "2026-10-12", netCents: -10_000 }]),
    ).toMatchObject({
      status: "ok",
      checked: false,
      totalProfitCents: -10_000,
    });
    expect(evaluateRules(input()).consistency).toEqual({ status: "not_set" });
  });
});

describe("evaluateRules — payouts", () => {
  it("lower the balance and the distance to a static floor from their day", () => {
    const status = evaluateRules(
      input({
        days: [
          { tradingDay: "2026-10-12", netCents: 100_000 },
          { tradingDay: "2026-10-14", netCents: 20_000 },
        ],
        payouts: [{ tradingDay: "2026-10-13", amountCents: 50_000 }],
      }),
    );
    expect(status.drawdown).toEqual({
      status: "ok",
      floorCents: 4_800_000,
      balanceCents: 5_070_000,
      distanceCents: 270_000,
    });
    expect(status.profitTarget.progressCents).toBe(70_000);
  });

  it("are no trading P&L: no trading day, not today's loss, not in consistency's total", () => {
    const status = evaluateRules(
      input({
        rules: {
          ...input().rules,
          dailyLossLimitCents: 100_000,
          consistencyPercent: 70,
        },
        days: [
          { tradingDay: "2026-10-15", netCents: 40_000 },
          { tradingDay: "2026-10-16", netCents: 60_000 },
        ],
        payouts: [{ tradingDay: "2026-10-19", amountCents: 50_000 }], // today
      }),
    );
    expect(status.dailyLoss).toMatchObject({
      status: "ok",
      todayNetCents: 0,
      distanceCents: 100_000,
    });
    expect(status.consistency).toMatchObject({
      status: "ok",
      bestDayCents: 60_000,
      totalProfitCents: 100_000,
    });
    expect(status.minTradingDays).toMatchObject({ doneDays: 2 });
    expect(status.profitTarget.progressCents).toBe(50_000);
  });

  it("leave an EOD trailing floor where it stood and ignore days after today", () => {
    const status = evaluateRules(
      input({
        rules: { ...input().rules, drawdownType: "eod_trailing" },
        days: [{ tradingDay: "2026-10-12", netCents: 100_000 }], // floor $49,000
        payouts: [
          { tradingDay: "2026-10-13", amountCents: 60_000 },
          { tradingDay: "2026-10-20", amountCents: 99_000 }, // tomorrow
        ],
      }),
    );
    expect(status.drawdown).toEqual({
      status: "ok",
      floorCents: 4_900_000,
      balanceCents: 5_040_000,
      distanceCents: 140_000,
    });
  });
});

describe("evaluateRules — profit target", () => {
  it("measures balance minus starting balance against the target, with no close state", () => {
    const status = evaluateRules(
      input({
        days: [
          { tradingDay: "2026-10-12", netCents: 250_000 },
          { tradingDay: "2026-10-13", netCents: 40_000 },
        ],
      }),
    );
    expect(status.profitTarget).toEqual({
      status: "ok",
      progressCents: 290_000,
      targetCents: 300_000,
    });
  });
});

describe("evaluateRules — minimum trading days", () => {
  it("counts the trading days with a taken trade, with no close state", () => {
    const status = evaluateRules(
      input({
        days: [
          { tradingDay: "2026-10-12", netCents: 10_000 },
          { tradingDay: "2026-10-13", netCents: -10_000 },
          { tradingDay: "2026-10-14", netCents: 0 },
        ],
      }),
    );
    expect(status.minTradingDays).toEqual({
      status: "ok",
      doneDays: 3,
      requiredDays: 5,
    });
  });

  it("is not set when the user left it empty", () => {
    const status = evaluateRules(
      input({
        rules: { ...input().rules, minTradingDays: null },
      }),
    );
    expect(status.minTradingDays).toEqual({ status: "not_set" });
  });
});

describe("evaluateRules — attempt window", () => {
  it("ignores days after today's trading day, keeping a Sunday trade rolled onto tomorrow's Monday", () => {
    const status = evaluateRules(
      input({
        today: "2026-10-18", // Sunday: today's trading day is Monday 19th
        days: [
          { tradingDay: "2026-10-16", netCents: 10_000 },
          { tradingDay: "2026-10-19", netCents: 20_000 },
          { tradingDay: "2026-10-20", netCents: 99_000 },
        ],
      }),
    );
    expect(status.profitTarget.progressCents).toBe(30_000);
    expect(status.minTradingDays).toMatchObject({ doneDays: 2 });
  });
});

describe("toRuleTradingDay", () => {
  it("keeps a weekday and rolls Saturday and Sunday onto the following Monday", () => {
    expect(toRuleTradingDay("2026-10-16")).toBe("2026-10-16"); // Friday
    expect(toRuleTradingDay("2026-10-17")).toBe("2026-10-19"); // Saturday
    expect(toRuleTradingDay("2026-10-18")).toBe("2026-10-19"); // Sunday
    expect(toRuleTradingDay("2026-12-27")).toBe("2026-12-28"); // across a month
  });
});

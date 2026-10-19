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
      minTradingDays: 5,
    },
    startingBalanceCents: 5_000_000,
    days: [],
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

describe("evaluateRules — attempt window and pending types", () => {
  it("leaves EOD and intraday trailing drawdowns unevaluated", () => {
    for (const drawdownType of ["eod_trailing", "intraday_trailing"] as const) {
      const status = evaluateRules(
        input({ rules: { ...input().rules, drawdownType } }),
      );
      expect(status.drawdown).toBeNull();
    }
  });

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

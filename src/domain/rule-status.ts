import { TZDate } from "@date-fns/tz";
import { addDays, format, getDay } from "date-fns";
import type { DrawdownType } from "./account-rules.ts";
import type { IsoDate } from "./streak.ts";

// Rule status: how a linked account's current attempt stands against its
// account rules (GLOSSARY.md). Not the consistency score — that module is
// about behaviour and never reads P&L; this one is only about P&L.
//
// Contract:
//
// - Amounts arrive and leave as **integer cents**, USD, like every prop firm
//   limit. Sums and comparisons stay in integers.
// - `days` is the attempt's day series from `getAttemptDays`: one item per
//   trading day with a taken trade, the account's own value without the copy
//   multiplier, net of its commission. The caller owns the attempt boundary.
// - `days` arrive in ascending order.
// - `today` is the user's calendar date; the module owns no clock. Days after
//   today's trading day are not part of the attempt yet.

/** "Close" starts when the distance to the floor is at most this share of the drawdown amount. */
export const DRAWDOWN_CLOSE_PERCENT = 20;

export interface RuleDay {
  tradingDay: IsoDate;
  netCents: number;
}

export interface RuleStatusRules {
  profitTargetCents: number;
  drawdownAmountCents: number;
  drawdownType: DrawdownType;
  minTradingDays: number | null;
}

export interface RuleStatusInput {
  rules: RuleStatusRules;
  /** `accounts.starting_balance_usd` in cents. */
  startingBalanceCents: number;
  days: RuleDay[];
  today: IsoDate;
}

export interface DrawdownStatus {
  status: "ok" | "close" | "breached";
  floorCents: number;
  balanceCents: number;
  /** Balance − floor; zero or below once the balance stands on the floor. */
  distanceCents: number;
}

/** A figure, not a judgement: reaching the target informs, it does not reward. */
export interface ProfitTargetStatus {
  status: "ok";
  /** Balance − starting balance; negative while the attempt is down. */
  progressCents: number;
  targetCents: number;
}

export type MinTradingDaysStatus =
  | { status: "not_set" }
  | { status: "ok"; doneDays: number; requiredDays: number };

export interface RuleStatus {
  profitTarget: ProfitTargetStatus;
  /** Null for a drawdown type this module does not evaluate yet (tickets 03). */
  drawdown: DrawdownStatus | null;
  minTradingDays: MinTradingDaysStatus;
}

/**
 * The trading day a date belongs to for the account rules: the streak's rule
 * (`toTradingDay`), Sunday onto the following Monday, except that a Saturday
 * rolls onto Monday as well instead of dropping out — its P&L belongs in the
 * balance (decided 2026-10-19). `getAttemptDays` applies the same rule in SQL.
 */
export function toRuleTradingDay(date: IsoDate): IsoDate {
  const day = new TZDate(`${date}T00:00:00Z`, "UTC");
  const weekday = getDay(day);
  if (weekday === 6) return format(addDays(day, 2), "yyyy-MM-dd");
  if (weekday === 0) return format(addDays(day, 1), "yyyy-MM-dd");
  return date;
}

export function evaluateRules(input: RuleStatusInput): RuleStatus {
  const { rules, startingBalanceCents } = input;
  const todayTradingDay = toRuleTradingDay(input.today);
  const days = input.days.filter((day) => day.tradingDay <= todayTradingDay);
  // End-of-day balances in day order: the last is the balance now, the
  // lowest decides whether the floor was ever reached.
  let balanceCents = startingBalanceCents;
  let lowestCents = startingBalanceCents;
  for (const day of days) {
    balanceCents += day.netCents;
    lowestCents = Math.min(lowestCents, balanceCents);
  }
  return {
    profitTarget: {
      status: "ok",
      progressCents: balanceCents - startingBalanceCents,
      targetCents: rules.profitTargetCents,
    },
    drawdown:
      rules.drawdownType === "static"
        ? staticDrawdown(
            startingBalanceCents - rules.drawdownAmountCents,
            rules.drawdownAmountCents,
            balanceCents,
            lowestCents,
          )
        : null,
    // Every day in the series carries a taken trade, so its length is the count.
    minTradingDays:
      rules.minTradingDays === null
        ? { status: "not_set" }
        : {
            status: "ok",
            doneDays: days.length,
            requiredDays: rules.minTradingDays,
          },
  };
}

// The floor never moves. Reaching it on any day's close breaches the attempt,
// even when a later day climbs back above it.
function staticDrawdown(
  floorCents: number,
  amountCents: number,
  balanceCents: number,
  lowestCents: number,
): DrawdownStatus {
  const distanceCents = balanceCents - floorCents;
  let status: DrawdownStatus["status"] = "ok";
  if (lowestCents <= floorCents) status = "breached";
  else if (isClose(distanceCents, amountCents)) status = "close";
  return { status, floorCents, balanceCents, distanceCents };
}

// distance ≤ 20 % of the allowance, compared in integers: 100·d ≤ 20·a.
function isClose(distanceCents: number, allowanceCents: number): boolean {
  return distanceCents * 100 <= allowanceCents * DRAWDOWN_CLOSE_PERCENT;
}

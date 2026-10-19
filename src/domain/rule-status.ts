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
  /** The balance an EOD trailing floor stops at, in cents. */
  lockLevelCents: number | null;
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

/** The journal has no intraday balance, so an intraday trailing floor is never guessed. */
export interface NotCheckableStatus {
  status: "not_checkable";
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
  drawdown: DrawdownStatus | NotCheckableStatus;
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
  // End-of-day balances in day order; the last one is the balance now.
  const closesCents: number[] = [];
  let runningCents = startingBalanceCents;
  for (const day of days) {
    runningCents += day.netCents;
    closesCents.push(runningCents);
  }
  const balanceCents = closesCents.at(-1) ?? startingBalanceCents;
  return {
    profitTarget: {
      status: "ok",
      progressCents: balanceCents - startingBalanceCents,
      targetCents: rules.profitTargetCents,
    },
    drawdown: evaluateDrawdown(rules, startingBalanceCents, closesCents),
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

function evaluateDrawdown(
  rules: RuleStatusRules,
  startingBalanceCents: number,
  closesCents: number[],
): DrawdownStatus | NotCheckableStatus {
  const amountCents = rules.drawdownAmountCents;
  switch (rules.drawdownType) {
    case "static":
      return walkFloor(startingBalanceCents, amountCents, closesCents, null);
    case "eod_trailing":
      return walkFloor(startingBalanceCents, amountCents, closesCents, {
        lockLevelCents: rules.lockLevelCents,
      });
    case "intraday_trailing":
      return { status: "not_checkable" };
    default: {
      const unknown: never = rules.drawdownType;
      throw new Error(`Unknown drawdown type: ${unknown}`);
    }
  }
}

// Walks the closes in day order. Each close is measured against the floor as
// it stood after the previous close; reaching it breaches the attempt, even
// when a later day climbs back above it. Without `trailing` the floor never
// moves. With it, the floor follows the highest close minus the amount: it
// rises only on a new high, stops at the lock level and never falls — a lock
// level under the starting floor leaves the floor where it is.
function walkFloor(
  startingBalanceCents: number,
  amountCents: number,
  closesCents: number[],
  trailing: { lockLevelCents: number | null } | null,
): DrawdownStatus {
  let highCents = startingBalanceCents;
  let floorCents = startingBalanceCents - amountCents;
  let breached = false;
  for (const closeCents of closesCents) {
    if (closeCents <= floorCents) breached = true;
    if (trailing && closeCents > highCents) {
      highCents = closeCents;
      const trailedCents =
        trailing.lockLevelCents === null
          ? highCents - amountCents
          : Math.min(highCents - amountCents, trailing.lockLevelCents);
      floorCents = Math.max(floorCents, trailedCents);
    }
  }
  const balanceCents = closesCents.at(-1) ?? startingBalanceCents;
  const distanceCents = balanceCents - floorCents;
  let status: DrawdownStatus["status"] = "ok";
  if (breached) status = "breached";
  else if (isClose(distanceCents, amountCents)) status = "close";
  return { status, floorCents, balanceCents, distanceCents };
}

// distance ≤ 20 % of the allowance, compared in integers: 100·d ≤ 20·a.
function isClose(distanceCents: number, allowanceCents: number): boolean {
  return distanceCents * 100 <= allowanceCents * DRAWDOWN_CLOSE_PERCENT;
}

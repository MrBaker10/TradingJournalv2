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
// - `days` and `payouts` come from `getAttempt`, ascending: one day per
//   trading day with a taken trade, the account's own value without the copy
//   multiplier, net of its commission; payouts summed per trading day. The
//   caller owns the attempt boundary (evaluation start or latest reset).
// - `today` is the user's calendar date; the module owns no clock. Days after
//   today's trading day are not part of the attempt yet, payouts neither.

/** "Close" starts when the distance to the floor is at most this share of the drawdown amount. */
export const DRAWDOWN_CLOSE_PERCENT = 20;

/** "Close" starts when what today may still lose is at most this share of the daily loss limit. */
export const DAILY_LOSS_CLOSE_PERCENT = 20;

/** "Close" starts when the best day's share is within this many percentage points of the consistency limit. */
export const CONSISTENCY_CLOSE_POINTS = 5;

export interface RuleDay {
  tradingDay: IsoDate;
  netCents: number;
}

/** A payout on the account, summed per trading day, in cents. */
export interface RulePayout {
  tradingDay: IsoDate;
  amountCents: number;
}

export interface RuleStatusRules {
  profitTargetCents: number;
  drawdownAmountCents: number;
  drawdownType: DrawdownType;
  /** The balance an EOD trailing floor stops at, in cents. */
  lockLevelCents: number | null;
  dailyLossLimitCents: number | null;
  consistencyPercent: number | null;
  minTradingDays: number | null;
}

export interface RuleStatusInput {
  rules: RuleStatusRules;
  /** `accounts.starting_balance_usd` in cents. */
  startingBalanceCents: number;
  days: RuleDay[];
  /** Payouts inside the attempt, ascending; they lower the balance, never P&L. */
  payouts: RulePayout[];
  today: IsoDate;
}

/** Where a checked rule stands; "close" and "breached" read amber and red. */
export type RuleState = "ok" | "close" | "breached";

export interface DrawdownStatus {
  status: RuleState;
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

export type DailyLossStatus =
  | { status: "not_set" }
  | {
      status: RuleState;
      /** Net of today's trading day; 0 without a trade today. */
      todayNetCents: number;
      limitCents: number;
      /** Limit + today's net: what today may still lose. */
      distanceCents: number;
    };

export type ConsistencyStatus =
  | { status: "not_set" }
  /** Skipped: without profit there is no share to hold. */
  | {
      status: "ok";
      checked: false;
      totalProfitCents: number;
      limitPercent: number;
    }
  | {
      status: RuleState;
      checked: true;
      bestDayCents: number;
      totalProfitCents: number;
      /** Best day ÷ total profit in tenths of a percent: 504 = 50.4 %. */
      shareTenthsPercent: number;
      limitPercent: number;
    };

export type MinTradingDaysStatus =
  | { status: "not_set" }
  | { status: "ok"; doneDays: number; requiredDays: number };

export interface RuleStatus {
  profitTarget: ProfitTargetStatus;
  drawdown: DrawdownStatus | NotCheckableStatus;
  dailyLoss: DailyLossStatus;
  consistency: ConsistencyStatus;
  minTradingDays: MinTradingDaysStatus;
}

const STATE_RANK: Record<RuleState, number> = { ok: 0, close: 1, breached: 2 };

/**
 * The worst state among the rules that were checked, for the settings rule
 * dot. Rules that are not set or not checkable carry no state and are left
 * out; the profit target is always checked, so there is always a state.
 */
export function worstRuleState(status: RuleStatus): RuleState {
  let worst: RuleState = "ok";
  for (const { status: state } of Object.values(status)) {
    if (isRuleState(state) && STATE_RANK[state] > STATE_RANK[worst])
      worst = state;
  }
  return worst;
}

function isRuleState(state: string): state is RuleState {
  return state in STATE_RANK;
}

/**
 * The trading day a date belongs to for the account rules: the streak's rule
 * (`toTradingDay`), Sunday onto the following Monday, except that a Saturday
 * rolls onto Monday as well instead of dropping out — its P&L belongs in the
 * balance (decided 2026-10-19). `getAttempt` applies the same rule in SQL.
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
  const payouts = input.payouts.filter(
    (payout) => payout.tradingDay <= todayTradingDay,
  );
  const closesCents = endOfDayBalances(startingBalanceCents, days, payouts);
  const balanceCents = closesCents.at(-1) ?? startingBalanceCents;
  const tradingProfitCents = days.reduce((sum, day) => sum + day.netCents, 0);
  return {
    profitTarget: {
      status: "ok",
      progressCents: balanceCents - startingBalanceCents,
      targetCents: rules.profitTargetCents,
    },
    drawdown: evaluateDrawdown(rules, startingBalanceCents, closesCents),
    dailyLoss: evaluateDailyLoss(
      rules.dailyLossLimitCents,
      days,
      todayTradingDay,
    ),
    consistency: evaluateConsistency(
      rules.consistencyPercent,
      days,
      tradingProfitCents,
    ),
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

// The balance at the end of every day that moved it, in day order: a trading
// day adds its net, a payout takes its amount away on its day. A day with
// only a payout has a close too — it lowers the balance — but it is no
// trading day.
function endOfDayBalances(
  startingBalanceCents: number,
  days: RuleDay[],
  payouts: RulePayout[],
): number[] {
  const movesCents = new Map<IsoDate, number>();
  for (const day of days) {
    movesCents.set(
      day.tradingDay,
      (movesCents.get(day.tradingDay) ?? 0) + day.netCents,
    );
  }
  for (const payout of payouts) {
    movesCents.set(
      payout.tradingDay,
      (movesCents.get(payout.tradingDay) ?? 0) - payout.amountCents,
    );
  }
  const closesCents: number[] = [];
  let runningCents = startingBalanceCents;
  for (const tradingDay of [...movesCents.keys()].sort()) {
    runningCents += movesCents.get(tradingDay) ?? 0;
    closesCents.push(runningCents);
  }
  return closesCents;
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
  const status = ruleState(
    breached,
    isClose(distanceCents, amountCents, DRAWDOWN_CLOSE_PERCENT),
  );
  return { status, floorCents, balanceCents, distanceCents };
}

// Only today's trading day counts. The limit is measured from where today
// started, so a green day so far widens the room rather than resetting it.
function evaluateDailyLoss(
  limitCents: number | null,
  days: RuleDay[],
  todayTradingDay: IsoDate,
): DailyLossStatus {
  if (limitCents === null) return { status: "not_set" };
  const todayNetCents =
    days.find((day) => day.tradingDay === todayTradingDay)?.netCents ?? 0;
  const distanceCents = limitCents + todayNetCents;
  const status = ruleState(
    distanceCents <= 0,
    isClose(distanceCents, limitCents, DAILY_LOSS_CLOSE_PERCENT),
  );
  return { status, todayNetCents, limitCents, distanceCents };
}

// The best day's share of total profit against the limit, compared in
// integers: share > limit ⇔ 100·best > limit·total. Exactly the limit is
// still allowed; it is the largest share one day may hold.
function evaluateConsistency(
  limitPercent: number | null,
  days: RuleDay[],
  totalProfitCents: number,
): ConsistencyStatus {
  if (limitPercent === null) return { status: "not_set" };
  if (totalProfitCents <= 0) {
    return { status: "ok", checked: false, totalProfitCents, limitPercent };
  }
  const bestDayCents = Math.max(...days.map((day) => day.netCents));
  const bestTimes100 = bestDayCents * 100;
  const status = ruleState(
    bestTimes100 > limitPercent * totalProfitCents,
    bestTimes100 >=
      (limitPercent - CONSISTENCY_CLOSE_POINTS) * totalProfitCents,
  );
  return {
    status,
    checked: true,
    bestDayCents,
    totalProfitCents,
    // A ratio for display, rounded to a tenth of a percent; the state above
    // is decided in integers, not from this figure.
    shareTenthsPercent: Math.round((bestDayCents * 1000) / totalProfitCents),
    limitPercent,
  };
}

function ruleState(breached: boolean, close: boolean): RuleState {
  if (breached) return "breached";
  return close ? "close" : "ok";
}

// distance ≤ percent of the allowance, compared in integers: 100·d ≤ p·a.
function isClose(
  distanceCents: number,
  allowanceCents: number,
  percent: number,
): boolean {
  return distanceCents * 100 <= allowanceCents * percent;
}

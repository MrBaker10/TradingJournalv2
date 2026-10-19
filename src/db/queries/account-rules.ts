import { and, asc, eq, gte, sql } from "drizzle-orm";
import type { DrawdownType } from "../../domain/account-rules.ts";
import { amountToCents } from "../../domain/commission.ts";
import type { RuleDay } from "../../domain/rule-status.ts";
import type { IsoDate } from "../../domain/streak.ts";
import { db } from "../index.ts";
import { accountRules } from "../schema/account-rules.ts";
import { accounts } from "../schema/accounts.ts";
import { instruments } from "../schema/instruments.ts";
import { propFirmPrograms, propFirms } from "../schema/prop-firms.ts";
import { trades } from "../schema/trades.ts";
import { assignedToAccount, moneyContribution, toNumber } from "./scope.ts";

// Reads of the prop firm program link. It is written with the account it
// belongs to, in `saveAccountDraft` (account-editor.ts).

/** Account rules as entered, money in USD cents (docs/adr/0001). */
export interface AccountRulesWrite {
  programId: number;
  evaluationStart: IsoDate;
  profitTargetCents: number;
  drawdownAmountCents: number;
  drawdownType: DrawdownType;
  lockLevelCents: number | null;
  dailyLossLimitCents: number | null;
  consistencyPercent: number | null;
  minTradingDays: number | null;
}

export interface AccountRulesRow extends AccountRulesWrite {
  accountId: number;
  firmName: string;
  programName: string;
}

/** Every link of the user's accounts, archived ones included, for settings. */
export async function listAccountRules(
  userId: number,
  executor: Pick<typeof db, "select"> = db,
): Promise<AccountRulesRow[]> {
  const rows = await executor
    .select({
      accountId: accountRules.accountId,
      programId: accountRules.programId,
      firmName: propFirms.name,
      programName: propFirmPrograms.name,
      evaluationStart: accountRules.evaluationStart,
      profitTarget: accountRules.profitTarget,
      drawdownAmount: accountRules.drawdownAmount,
      drawdownType: accountRules.drawdownType,
      lockLevel: accountRules.lockLevel,
      dailyLossLimit: accountRules.dailyLossLimit,
      consistencyPercent: accountRules.consistencyPercent,
      minTradingDays: accountRules.minTradingDays,
    })
    .from(accountRules)
    .innerJoin(accounts, eq(accounts.id, accountRules.accountId))
    .innerJoin(
      propFirmPrograms,
      eq(propFirmPrograms.id, accountRules.programId),
    )
    .innerJoin(propFirms, eq(propFirms.id, propFirmPrograms.firmId))
    .where(eq(accounts.userId, userId))
    .orderBy(asc(accounts.sortOrder));
  const cents = (value: string | null) =>
    value === null ? null : amountToCents(value);
  return rows.map(
    ({ profitTarget, drawdownAmount, lockLevel, dailyLossLimit, ...row }) => ({
      ...row,
      profitTargetCents: amountToCents(profitTarget),
      drawdownAmountCents: amountToCents(drawdownAmount),
      lockLevelCents: cents(lockLevel),
      dailyLossLimitCents: cents(dailyLossLimit),
    }),
  );
}

// `toRuleTradingDay` in SQL: Saturday +2 and Sunday +1 onto the Monday.
const ruleTradingDay = sql<string>`(${trades.tradeDate} + case extract(isodow from ${trades.tradeDate})
  when 6 then 2 when 7 then 1 else 0 end)::date`;

/**
 * The current attempt's net P&L per trading day for one linked account, in
 * USD cents, ascending — the day series `evaluateRules` reads. The account's
 * own value: no copy multiplier, net of its own commission, as the selected
 * account sees it everywhere else (`moneyContribution`). Taken trades only,
 * from the evaluation start on. Empty for an account that is not linked or
 * not the user's.
 */
export async function getAttemptDays(
  userId: number,
  accountId: number,
  executor: Pick<typeof db, "select"> = db,
): Promise<RuleDay[]> {
  const contribution = moneyContribution({
    userId,
    selectedAccountId: accountId,
  });
  const rows = await executor
    .select({
      tradingDay: ruleTradingDay,
      netCents: sql<string>`coalesce(sum(${contribution}), 0)::bigint`,
    })
    .from(trades)
    .innerJoin(instruments, eq(instruments.id, trades.instrumentId))
    .innerJoin(accountRules, eq(accountRules.accountId, accountId))
    .innerJoin(
      accounts,
      and(eq(accounts.id, accountRules.accountId), eq(accounts.userId, userId)),
    )
    .where(
      and(
        eq(trades.userId, userId),
        eq(trades.taken, true),
        assignedToAccount(accountId),
        gte(trades.tradeDate, accountRules.evaluationStart),
      ),
    )
    .groupBy(ruleTradingDay)
    .orderBy(ruleTradingDay);
  return rows.map((row) => ({
    tradingDay: row.tradingDay,
    netCents: toNumber(row.netCents),
  }));
}

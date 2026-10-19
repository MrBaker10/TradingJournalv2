import { asc, eq } from "drizzle-orm";
import type { DrawdownType } from "../../domain/account-rules.ts";
import { amountToCents } from "../../domain/commission.ts";
import type { IsoDate } from "../../domain/streak.ts";
import { db } from "../index.ts";
import { accountRules } from "../schema/account-rules.ts";
import { accounts } from "../schema/accounts.ts";
import { propFirmPrograms, propFirms } from "../schema/prop-firms.ts";

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

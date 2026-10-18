import { and, asc, eq, inArray } from "drizzle-orm";
import { amountToCents } from "../../domain/commission.ts";
import { db } from "../index.ts";
import { accountCommissionRates, accounts } from "../schema/accounts.ts";
import { instruments } from "../schema/instruments.ts";

// Per-side commission rates per account and instrument (commissions). Every
// read and write goes through `accounts.user_id`: an account id from the
// client is a permission boundary, not a label (coding-standards.md).

export interface CommissionRate {
  accountId: number;
  instrumentId: number;
  instrumentSymbol: string;
  /** USD per contract and side, in integer cents. */
  perSideCents: number;
}

/** The rates of these accounts, when they are this user's. */
export async function listCommissionRates(
  userId: number,
  accountIds: number[],
): Promise<CommissionRate[]> {
  if (accountIds.length === 0) return [];

  const rows = await db
    .select({
      accountId: accountCommissionRates.accountId,
      instrumentId: accountCommissionRates.instrumentId,
      instrumentSymbol: instruments.symbol,
      perSide: accountCommissionRates.perSide,
    })
    .from(accountCommissionRates)
    .innerJoin(accounts, eq(accounts.id, accountCommissionRates.accountId))
    .innerJoin(
      instruments,
      eq(instruments.id, accountCommissionRates.instrumentId),
    )
    .where(
      and(
        eq(accounts.userId, userId),
        inArray(accountCommissionRates.accountId, accountIds),
      ),
    )
    .orderBy(asc(instruments.symbol));

  return rows.map((row) => ({
    accountId: row.accountId,
    instrumentId: row.instrumentId,
    instrumentSymbol: row.instrumentSymbol,
    perSideCents: amountToCents(row.perSide),
  }));
}

import { and, asc, eq, inArray } from "drizzle-orm";
import { amountToCents, centsToAmount } from "../../domain/commission.ts";
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

/**
 * Sets one rate, replacing the account's earlier rate for that instrument.
 * Returns false when the account is not this user's. A stored commission is
 * never touched here — a new rate applies to the next save only.
 */
export async function setCommissionRate(
  userId: number,
  accountId: number,
  instrumentId: number,
  perSideCents: number,
): Promise<boolean> {
  const [owned] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1);
  if (owned === undefined) return false;

  await db
    .insert(accountCommissionRates)
    .values({ accountId, instrumentId, perSide: centsToAmount(perSideCents) })
    .onConflictDoUpdate({
      target: [
        accountCommissionRates.accountId,
        accountCommissionRates.instrumentId,
      ],
      set: { perSide: centsToAmount(perSideCents) },
    });
  return true;
}

/** Removes one rate. Returns false when the account is not this user's. */
export async function removeCommissionRate(
  userId: number,
  accountId: number,
  instrumentId: number,
): Promise<boolean> {
  const [owned] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1);
  if (owned === undefined) return false;

  await db
    .delete(accountCommissionRates)
    .where(
      and(
        eq(accountCommissionRates.accountId, accountId),
        eq(accountCommissionRates.instrumentId, instrumentId),
      ),
    );
  return true;
}

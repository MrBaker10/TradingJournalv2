import { and, asc, eq, gte, isNull, type SQL, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { DrawdownType } from "../../domain/account-rules.ts";
import { amountToCents } from "../../domain/commission.ts";
import type { RuleDay, RulePayout } from "../../domain/rule-status.ts";
import type { IsoDate } from "../../domain/streak.ts";
import { db } from "../index.ts";
import { accountRules } from "../schema/account-rules.ts";
import { accounts } from "../schema/accounts.ts";
import { instruments } from "../schema/instruments.ts";
import { ledgerEntries } from "../schema/ledger.ts";
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
  /**
   * The firm no longer sells the program (docs/adr/0005). Only a note in
   * settings: the link, the account rules and the rule status stay as they are.
   */
  programDiscontinued: boolean;
  /** `accounts.starting_balance_usd`: the attempt's starting balance. */
  startingBalanceUsdCents: number;
}

// The links of the user's accounts that match `where`, archived accounts
// included, in the accounts' order.
async function selectAccountRules(
  userId: number,
  where: SQL | undefined,
  executor: Pick<typeof db, "select">,
): Promise<AccountRulesRow[]> {
  const rows = await executor
    .select({
      accountId: accountRules.accountId,
      programId: accountRules.programId,
      firmName: propFirms.name,
      programName: propFirmPrograms.name,
      programDiscontinued: sql<boolean>`${propFirmPrograms.discontinuedAt} is not null`,
      evaluationStart: accountRules.evaluationStart,
      profitTarget: accountRules.profitTarget,
      drawdownAmount: accountRules.drawdownAmount,
      drawdownType: accountRules.drawdownType,
      lockLevel: accountRules.lockLevel,
      dailyLossLimit: accountRules.dailyLossLimit,
      consistencyPercent: accountRules.consistencyPercent,
      minTradingDays: accountRules.minTradingDays,
      startingBalanceUsd: accounts.startingBalanceUsd,
    })
    .from(accountRules)
    .innerJoin(accounts, eq(accounts.id, accountRules.accountId))
    .innerJoin(
      propFirmPrograms,
      eq(propFirmPrograms.id, accountRules.programId),
    )
    .innerJoin(propFirms, eq(propFirms.id, propFirmPrograms.firmId))
    .where(and(eq(accounts.userId, userId), where))
    .orderBy(asc(accounts.sortOrder));
  const cents = (value: string | null) =>
    value === null ? null : amountToCents(value);
  return rows.map(
    ({
      profitTarget,
      drawdownAmount,
      lockLevel,
      dailyLossLimit,
      startingBalanceUsd,
      ...row
    }) => ({
      ...row,
      profitTargetCents: amountToCents(profitTarget),
      drawdownAmountCents: amountToCents(drawdownAmount),
      lockLevelCents: cents(lockLevel),
      dailyLossLimitCents: cents(dailyLossLimit),
      startingBalanceUsdCents: amountToCents(startingBalanceUsd),
    }),
  );
}

/** Every link of the user's accounts, archived ones included, for settings. */
export async function listAccountRules(
  userId: number,
  executor: Pick<typeof db, "select"> = db,
): Promise<AccountRulesRow[]> {
  return selectAccountRules(userId, undefined, executor);
}

export interface ProgramLink {
  programId: number;
  accountName: string;
  /** The program's `account_size_usd` in whole USD; null when not stated. */
  accountSizeUsd: number | null;
}

/**
 * The programs the user's real, active accounts are linked to, in the
 * accounts' order, for the Prop Firm Rules catalogue. Practice accounts stay
 * out like everywhere combined; archived ones are out of the selector too.
 */
export async function listProgramLinks(
  userId: number,
  executor: Pick<typeof db, "select"> = db,
): Promise<ProgramLink[]> {
  return executor
    .select({
      programId: accountRules.programId,
      accountName: accounts.name,
      // Whole dollars by construction (listAccountSizes), so the cast never
      // rounds.
      accountSizeUsd: sql<
        number | null
      >`${propFirmPrograms.accountSizeUsd}::int`,
    })
    .from(accountRules)
    .innerJoin(accounts, eq(accounts.id, accountRules.accountId))
    .innerJoin(
      propFirmPrograms,
      eq(propFirmPrograms.id, accountRules.programId),
    )
    .where(
      and(
        eq(accounts.userId, userId),
        eq(accounts.isPractice, false),
        isNull(accounts.archivedAt),
      ),
    )
    .orderBy(asc(accounts.sortOrder));
}

/**
 * One active account's link, or null when it is not linked, archived or not
 * the user's. Archiving keeps `users.selected_account_id`, so an archived
 * account can still be the selection while the switcher reads "All accounts".
 */
export async function getAccountRules(
  userId: number,
  accountId: number,
  executor: Pick<typeof db, "select"> = db,
): Promise<AccountRulesRow | null> {
  const [row] = await selectAccountRules(
    userId,
    and(eq(accountRules.accountId, accountId), isNull(accounts.archivedAt)),
    executor,
  );
  return row ?? null;
}

// `toRuleTradingDay` in SQL: Saturday +2 and Sunday +1 onto the Monday.
function ruleTradingDay(date: SQL | AnyPgColumn) {
  return sql<string>`(${date} + case extract(isodow from ${date})
  when 6 then 2 when 7 then 1 else 0 end)::date`;
}

/** Which `unionAll` branch a row of `getAttempt` came from. */
type AttemptRowKind = "start" | "day" | "payout";

/** The current attempt of a linked account: what `evaluateRules` reads. */
export interface Attempt {
  /** The evaluation start, or the latest reset expense when that is later. */
  start: IsoDate;
  days: RuleDay[];
  payouts: RulePayout[];
}

/**
 * The current attempt of one linked account in one statement: its start, its
 * net P&L per trading day and its payouts per trading day, in USD cents,
 * ascending. Null for an account that is not linked or not the user's.
 *
 * - The attempt starts on the later of the evaluation start and the latest
 *   reset expense on that account in the ledger, a $0 one included; that day
 *   counts. A reset dated after `today` (the user's calendar date) waits for
 *   its day.
 * - Days: the account's own value — no copy multiplier, net of its own
 *   commission, as the selected account sees it everywhere else
 *   (`moneyContribution`). Taken trades only.
 * - Payouts: real money leaving the account (docs/adr/0002). They lower the
 *   balance for the rules and are never trading P&L.
 */
export async function getAttempt(
  userId: number,
  accountId: number,
  today: IsoDate,
  executor: Pick<typeof db, "select"> = db,
): Promise<Attempt | null> {
  // `r` and not `ledger_entries`: the payout branch below reads that table
  // itself, and the subquery must not bind to its row.
  const attemptStart = sql<string>`greatest(${accountRules.evaluationStart}, (
    select max(r.entry_date) from ledger_entries r
    where r.account_id = ${accountId}
      and r.user_id = ${userId}
      and r.kind = 'expense' and r.category = 'reset'
      and r.entry_date <= ${today}
  ))`;
  const linkedAndOwned = and(
    eq(accounts.id, accountRules.accountId),
    eq(accounts.userId, userId),
  );

  const startBranch = executor
    .select({
      kind: sql<AttemptRowKind>`'start'`.as("kind"),
      day: sql<string>`${attemptStart}::date`.as("day"),
      cents: sql<string>`0::bigint`.as("cents"),
    })
    .from(accountRules)
    .innerJoin(accounts, linkedAndOwned)
    .where(eq(accountRules.accountId, accountId));

  const tradingDay = ruleTradingDay(trades.tradeDate);
  const contribution = moneyContribution({
    userId,
    selectedAccountId: accountId,
  });
  const dayBranch = executor
    .select({
      kind: sql<AttemptRowKind>`'day'`.as("kind"),
      day: sql<string>`${tradingDay}`.as("day"),
      cents: sql<string>`coalesce(sum(${contribution}), 0)::bigint`.as("cents"),
    })
    .from(trades)
    .innerJoin(instruments, eq(instruments.id, trades.instrumentId))
    .innerJoin(accountRules, eq(accountRules.accountId, accountId))
    .innerJoin(accounts, linkedAndOwned)
    .where(
      and(
        eq(trades.userId, userId),
        eq(trades.taken, true),
        assignedToAccount(accountId),
        gte(trades.tradeDate, attemptStart),
      ),
    )
    .groupBy(tradingDay);

  const payoutDay = ruleTradingDay(ledgerEntries.entryDate);
  const payoutBranch = executor
    .select({
      kind: sql<AttemptRowKind>`'payout'`.as("kind"),
      day: sql<string>`${payoutDay}`.as("day"),
      cents: sql<string>`sum(${ledgerEntries.amount} * 100)::bigint`.as(
        "cents",
      ),
    })
    .from(ledgerEntries)
    .innerJoin(
      accountRules,
      eq(accountRules.accountId, ledgerEntries.accountId),
    )
    .innerJoin(accounts, linkedAndOwned)
    .where(
      and(
        eq(ledgerEntries.accountId, accountId),
        eq(ledgerEntries.userId, userId),
        eq(ledgerEntries.kind, "payout"),
        gte(ledgerEntries.entryDate, attemptStart),
      ),
    )
    .groupBy(payoutDay);

  const rows = await startBranch.unionAll(dayBranch).unionAll(payoutBranch);
  const start = rows.find((row) => row.kind === "start");
  if (!start) return null;
  // ISO dates sort as text.
  const byDay = (a: { day: string }, b: { day: string }) =>
    a.day.localeCompare(b.day);
  return {
    start: start.day,
    days: rows
      .filter((row) => row.kind === "day")
      .sort(byDay)
      .map((row) => ({ tradingDay: row.day, netCents: toNumber(row.cents) })),
    payouts: rows
      .filter((row) => row.kind === "payout")
      .sort(byDay)
      .map((row) => ({
        tradingDay: row.day,
        amountCents: toNumber(row.cents),
      })),
  };
}

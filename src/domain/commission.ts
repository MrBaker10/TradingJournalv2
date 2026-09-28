// Commission per trade and account (current-feature.md, commissions).
//
// A trade's commission is stored per assignment — each account pays its own —
// in integer cents here and `numeric(14,2)` USD in the database. Where the
// amount came from decides who may replace it later:
//
// - `file`   — the broker's export charged it. The best source there is.
// - `rate`   — derived from the account's per-side rate for the instrument.
// - `manual` — typed by the user. Nothing ever overwrites it.
//
// A rate change never touches a stored amount; the new rate applies to the
// next save and to a change of the contract count (decided 2026-09-28).
//
// Pure: no DB client, no `next/*`, no clock.

import type { ImportShape } from "./import/types.ts";

export const COMMISSION_SOURCES = ["file", "rate", "manual"] as const;
export type CommissionSource = (typeof COMMISSION_SOURCES)[number];

const TWO = BigInt(2);
const SIDES = BigInt(2);
// `trades.contracts` is `numeric(12,4)`: a CFD trades fractional lots.
const CONTRACT_SCALE = BigInt(10_000);

const AMOUNT = /^(\d+)(?:\.(\d{1,2}))?$/;

/**
 * A non-negative dollar amount with at most two decimals, as integer cents,
 * read exactly from the string — `"1.5"` is 150, never 149.99999.
 * Null for anything else, including an empty cell: an unknown commission is
 * not a free one.
 */
export function parseCommissionCents(raw: string): number | null {
  const match = AMOUNT.exec(raw.trim());
  if (match === null) return null;
  const [, whole, fraction = ""] = match;
  return Number(BigInt(whole + fraction.padEnd(2, "0")));
}

/**
 * What a round trip costs at a per-side rate: every contract is charged once
 * to open and once to close. Rounded half-up to the cent, which only a
 * fractional lot can need.
 */
export function commissionFromRate(
  perSideCents: number,
  contracts: number,
): number {
  if (!Number.isInteger(perSideCents) || perSideCents < 0) {
    throw new RangeError(
      `perSideCents must be a non-negative integer, got ${perSideCents}`,
    );
  }
  if (!Number.isFinite(contracts) || contracts < 0) {
    throw new RangeError(`contracts must be non-negative, got ${contracts}`);
  }
  const scaledContracts = BigInt(Math.round(contracts * 10_000));
  const product = BigInt(perSideCents) * SIDES * scaledContracts;
  return Number((product * TWO + CONTRACT_SCALE) / (CONTRACT_SCALE * TWO));
}

/**
 * The share of one fill's commission that belongs to `part` of its
 * `quantity`, for a fill that closes one round trip and opens the next.
 * Rounded half-up; the caller gives the rest to the other side, so the two
 * shares always add up to what the fill was charged.
 */
export function commissionShare(
  cents: number,
  part: number,
  quantity: number,
): number {
  if (part === quantity) return cents;
  const product = BigInt(cents) * BigInt(part);
  const denominator = BigInt(quantity);
  return Number((product * TWO + denominator) / (denominator * TWO));
}

/**
 * Whether an amount from `incoming` may replace what an assignment holds.
 * A hand-typed amount is final. A file amount outranks a rate-derived one,
 * and a newer file amount replaces an older one. A rate only ever refreshes
 * its own earlier result, or fills a gap.
 */
export function mayReplaceCommission(
  current: CommissionSource | null,
  incoming: Exclude<CommissionSource, "manual">,
): boolean {
  if (current === null) return true;
  if (current === "manual") return false;
  if (incoming === "file") return true;
  return current === "rate";
}

/**
 * Whether a row's commission is already inside the file's own P&L. Always for
 * an FTMO history — its credited amount is profit, commission and swap in one
 * — even for an open position whose P&L is not in the file yet; otherwise
 * whenever the file reports a P&L.
 */
export function commissionInFilePnl(
  shape: ImportShape,
  filePnlCents: number | null,
): boolean {
  return shape === "ftmo" || filePnlCents !== null;
}

/**
 * The commission an import writes for a row: what the file charged, else the
 * account's rate. Neither for a file that settles commission inside its own
 * P&L — an FTMO history, open positions included — so an FTMO row never
 * carries one (current-feature.md, commissions: FTMO unchanged).
 */
export function importCommission(input: {
  /** The file's charge for the round trip, USD cents, if it has one. */
  fileCents: number | null;
  /** Whether the file's own P&L already has the commission taken off. */
  commissionInFilePnl: boolean;
  perSideCents: number | null;
  contracts: number;
}): { cents: number; source: "file" | "rate" } | null {
  if (input.commissionInFilePnl) return null;
  if (input.fileCents !== null)
    return { cents: input.fileCents, source: "file" };
  if (input.perSideCents === null) return null;
  return {
    cents: commissionFromRate(input.perSideCents, input.contracts),
    source: "rate",
  };
}

/** A commission as an assignment holds it. */
export interface StoredCommission {
  cents: number;
  source: CommissionSource;
}

export interface CommissionOnSave {
  /** What the user typed into this account's field, if anything. */
  typedCents: number | undefined;
  /** The assignment's commission before this save; null for a new one. */
  existing: StoredCommission | null;
  /** The account's per-side rate for the trade's instrument, if it has one. */
  perSideCents: number | null;
  contracts: number;
  /**
   * Whether the contract count or the instrument changed in this save — the
   * only edits that make a rate-derived amount stale. False on create.
   */
  basisChanged: boolean;
  /**
   * Whether the trade's P&L is still the one an import file reported
   * (`pnl_source` set). That amount is what the account was credited, so the
   * commission is already in it — an FTMO row — and a rate must not take it a
   * second time.
   */
  pnlFromFile: boolean;
}

/**
 * What one account's commission is after the trade form saves
 * (decided 2026-09-28, commissions):
 *
 * - a typed amount is the user's and becomes `manual`;
 * - a file or typed amount already on the assignment stays;
 * - a rate-derived one stays too, unless contracts or instrument changed —
 *   a changed rate alone never rewrites a saved trade;
 * - otherwise the account's rate fills it in, and without a rate it stays
 *   what it was (null for a new assignment);
 * - never from a rate while the P&L is a file's own: it is net already.
 *
 * The form runs the same function to prefill each account's field, so what
 * the user sees before saving is what gets stored.
 */
export function commissionOnSave(
  input: CommissionOnSave,
): StoredCommission | null {
  if (input.typedCents !== undefined) {
    return { cents: input.typedCents, source: "manual" };
  }
  const { existing } = input;
  if (
    existing !== null &&
    (existing.source !== "rate" || !input.basisChanged)
  ) {
    return existing;
  }
  if (input.perSideCents !== null && !input.pnlFromFile) {
    return {
      cents: commissionFromRate(input.perSideCents, input.contracts),
      source: "rate",
    };
  }
  return existing;
}

/** Integer cents as the `numeric(14,2)` string the database stores. */
export function centsToAmount(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new RangeError(`cents must be a non-negative integer, got ${cents}`);
  }
  const value = BigInt(cents);
  const whole = value / BigInt(100);
  const fraction = (value % BigInt(100)).toString().padStart(2, "0");
  return `${whole}.${fraction}`;
}

/** The inverse, for a value read back from `numeric(14,2)`. */
export function amountToCents(amount: string): number {
  const cents = parseCommissionCents(amount);
  if (cents === null) {
    throw new RangeError(`not a stored commission amount: "${amount}"`);
  }
  return cents;
}

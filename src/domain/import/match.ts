// Which journal trade, if any, each import row refers to.
//
// The query hands over the candidates — this user's taken trades on the target
// account, on the dates the file mentions — and this module decides the
// pairing. It is pure: no DB client, no ids invented, and the same inputs
// always produce the same assignment.
//
// Two tiers, in order (current-feature.md, §Duplikaterkennung):
//
// **Tier 1** is the broker's own key. An exact hit, no tolerance.
//
// **Tier 2** keys on the *entry side only* — account, instrument, direction,
// contracts, entry price, date. The exit deliberately stays out of the key:
// a trade that was open at the first import and closed at the second must
// still be recognised as the same trade, and an exit in the key would make
// those two different trades and duplicate the position.
//
// Within one entry key the pairing runs in two phases, and the order matters.
// Phase one takes the rows whose exit already agrees; only then does phase two
// hand out what is left. Reversed, a file with two trades on the same entry
// would write one trade's exit onto the other — corrupting a trade that was
// already correct.

import { toScaledPrice } from "../pnl.ts";
import type { ExistingTrade } from "./outcome.ts";
import type { NormalizedTrade } from "./types.ts";

/** A candidate as the query reads it: a journal trade plus its broker key. */
export interface MatchableTrade extends ExistingTrade {
  brokerTradeKey: string | null;
}

// numeric(12,4): two prices that store identically must key identically.
function scaled(price: number): bigint {
  return toScaledPrice(price);
}

/**
 * The tier 2 key. Everything the entry side of a trade consists of, and
 * nothing else — no exit, and no chart-clock time, which a broker export
 * cannot be compared against anyway.
 *
 * The account is not part of the string: the candidate set is already scoped
 * to the one target account, so adding it would be a constant.
 */
export interface EntryKeyParts {
  tradeDate: string;
  instrumentId: number;
  direction: string;
  /** Null only on a missed setup, which an import can never match. */
  contracts: number | null;
  entryPrice: number;
}

export function entryKeyOf(trade: EntryKeyParts): string {
  return [
    trade.tradeDate,
    trade.instrumentId,
    trade.direction,
    trade.contracts ?? "none",
    scaled(trade.entryPrice),
  ].join("|");
}

function sameExit(row: NormalizedTrade, trade: MatchableTrade): boolean {
  if (row.exitPrice === null || trade.exitPrice === null) {
    return row.exitPrice === null && trade.exitPrice === null;
  }
  return scaled(row.exitPrice) === scaled(trade.exitPrice);
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const groupKey = key(item);
    const group = groups.get(groupKey);
    if (group === undefined) {
      groups.set(groupKey, [item]);
    } else {
      group.push(item);
    }
  }
  return groups;
}

/**
 * Pairs every import row with the journal trade it refers to, or null when it
 * is genuinely new.
 *
 * The result is parallel to `rows`. No journal trade is ever handed to two
 * rows: each one is consumed when it is taken, which is what makes a file
 * holding three identical scalps against one journalled trade come out as one
 * match and two new trades rather than three matches.
 */
export function matchRows(
  rows: NormalizedTrade[],
  candidates: MatchableTrade[],
): (MatchableTrade | null)[] {
  const matched: (MatchableTrade | null)[] = rows.map(() => null);
  const taken = new Set<number>();

  // --- Tier 1: the broker's key ------------------------------------------

  const keyed = candidates.filter((trade) => trade.brokerTradeKey !== null);
  const byBrokerKey = groupBy(keyed, (trade) => trade.brokerTradeKey ?? "");

  const unresolved: number[] = [];
  rows.forEach((row, index) => {
    if (row.brokerTradeKey === null) {
      unresolved.push(index);
      return;
    }
    const hit = byBrokerKey
      .get(row.brokerTradeKey)
      ?.find((trade) => !taken.has(trade.id));
    if (hit === undefined) {
      unresolved.push(index);
      return;
    }
    taken.add(hit.id);
    matched[index] = hit;
  });

  // --- Tier 2: the entry key, two phases ---------------------------------

  const candidatesByKey = groupBy(candidates, entryKeyOf);
  const pending = unresolved.map((index) => ({ ...rows[index], index }));
  const rowsByKey = groupBy(pending, entryKeyOf);

  for (const [key, group] of rowsByKey) {
    const pool = (candidatesByKey.get(key) ?? []).filter(
      (trade) => !taken.has(trade.id),
    );
    if (pool.length === 0) continue;

    const leftovers: (NormalizedTrade & { index: number })[] = [];

    // Phase one: the exits that already agree. These become skips.
    for (const row of group) {
      const hit = pool.find(
        (trade) => !taken.has(trade.id) && sameExit(row, trade),
      );
      if (hit === undefined) {
        leftovers.push(row);
        continue;
      }
      taken.add(hit.id);
      matched[row.index] = hit;
    }

    // Phase two: whatever is left, in order. These become updates.
    for (const row of leftovers) {
      const hit = pool.find((trade) => !taken.has(trade.id));
      if (hit === undefined) break;
      taken.add(hit.id);
      matched[row.index] = hit;
    }
  }

  return matched;
}

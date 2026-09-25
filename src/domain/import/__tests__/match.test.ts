import { describe, expect, it } from "vitest";
import { entryKeyOf, type MatchableTrade, matchRows } from "../match.ts";
import type { NormalizedTrade } from "../types.ts";

function row(overrides: Partial<NormalizedTrade> = {}): NormalizedTrade {
  return {
    instrumentId: 1,
    direction: "long",
    contracts: 2,
    tradeDate: "2026-08-20",
    entryTime: "09:30",
    entryPrice: 20000,
    exitTime: "09:45",
    exitPrice: 20050,
    brokerTradeKey: null,
    filePnlCents: null,
    stopPrice: null,
    stopNotice: null,
    sourceRow: 2,
    ...overrides,
  };
}

function candidate(overrides: Partial<MatchableTrade> = {}): MatchableTrade {
  return {
    id: 1,
    instrumentId: 1,
    direction: "long",
    contracts: 2,
    tradeDate: "2026-08-20",
    entryTime: "09:30:00",
    entryPrice: 20000,
    exitTime: "09:45:00",
    exitPrice: 20050,
    points: 50,
    result: "Win",
    brokerTradeKey: null,
    ...overrides,
  };
}

describe("entryKeyOf", () => {
  it("ignores the exit, so an open and a closed trade share a key", () => {
    const open = entryKeyOf(row({ exitPrice: null, exitTime: null }));
    const closed = entryKeyOf(row({ exitPrice: 20050 }));
    expect(open).toBe(closed);
  });

  it("ignores the entry time, which is a chart clock", () => {
    expect(entryKeyOf(row({ entryTime: "09:30" }))).toBe(
      entryKeyOf(row({ entryTime: "14:15" })),
    );
  });

  it("separates anything the entry side actually differs in", () => {
    const base = entryKeyOf(row());
    expect(entryKeyOf(row({ instrumentId: 2 }))).not.toBe(base);
    expect(entryKeyOf(row({ direction: "short" }))).not.toBe(base);
    expect(entryKeyOf(row({ contracts: 3 }))).not.toBe(base);
    expect(entryKeyOf(row({ entryPrice: 20001 }))).not.toBe(base);
    expect(entryKeyOf(row({ tradeDate: "2026-08-21" }))).not.toBe(base);
  });

  it("compares the entry price at the precision the column stores", () => {
    expect(entryKeyOf(row({ entryPrice: 20000 }))).toBe(
      entryKeyOf(row({ entryPrice: 20000.000004 })),
    );
  });
});

describe("matchRows — tier 1", () => {
  it("matches on the broker key before looking at anything else", () => {
    // Every entry-side field differs; only the key agrees.
    const matched = matchRows(
      [row({ brokerTradeKey: "abc", entryPrice: 1, contracts: 9 })],
      [candidate({ id: 42, brokerTradeKey: "abc" })],
    );
    expect(matched[0]?.id).toBe(42);
  });

  it("falls through to tier 2 when the key finds nothing", () => {
    const matched = matchRows(
      [row({ brokerTradeKey: "missing" })],
      [candidate({ id: 7, brokerTradeKey: "other" })],
    );
    expect(matched[0]?.id).toBe(7);
  });

  it("never gives one journal trade to two import rows", () => {
    const matched = matchRows(
      [row({ brokerTradeKey: "abc" }), row({ brokerTradeKey: "abc" })],
      [candidate({ id: 42, brokerTradeKey: "abc" })],
    );
    expect(matched[0]?.id).toBe(42);
    expect(matched[1]).toBeNull();
  });
});

describe("matchRows — tier 2, phase one", () => {
  it("pairs the row whose exit agrees exactly", () => {
    const matched = matchRows(
      [row({ exitPrice: 20080 })],
      [
        candidate({ id: 1, exitPrice: 20050 }),
        candidate({ id: 2, exitPrice: 20080 }),
      ],
    );
    expect(matched[0]?.id).toBe(2);
  });

  it("treats two open trades as an exact pair", () => {
    const matched = matchRows(
      [row({ exitPrice: null, exitTime: null })],
      [candidate({ id: 5, exitPrice: null, exitTime: null })],
    );
    expect(matched[0]?.id).toBe(5);
  });

  it("does not let a leftover row steal an exactly matching trade", () => {
    // Without the two phases, row one (exit 20080) would take trade 1 and
    // then overwrite its exit — corrupting a trade that was already right.
    const matched = matchRows(
      [row({ exitPrice: 20080 }), row({ exitPrice: 20050 })],
      [
        candidate({ id: 1, exitPrice: 20050 }),
        candidate({ id: 2, exitPrice: 20080 }),
      ],
    );
    expect(matched[0]?.id).toBe(2);
    expect(matched[1]?.id).toBe(1);
  });
});

describe("matchRows — tier 2, phase two", () => {
  it("pairs a closed row with the open trade it closes", () => {
    const matched = matchRows(
      [row({ exitPrice: 20050, exitTime: "09:45" })],
      [
        candidate({
          id: 9,
          exitPrice: null,
          exitTime: null,
          points: null,
          result: null,
        }),
      ],
    );
    expect(matched[0]?.id).toBe(9);
  });

  it("pairs an open row back onto a trade that is already closed", () => {
    // A truncated file re-imported after a complete one. outcome.ts then
    // reports a skip, because an import never makes a gap.
    const matched = matchRows(
      [row({ exitPrice: null, exitTime: null })],
      [candidate({ id: 9, exitPrice: 20050 })],
    );
    expect(matched[0]?.id).toBe(9);
  });

  it("takes the leftovers in order", () => {
    const matched = matchRows(
      [row({ exitPrice: 20010 }), row({ exitPrice: 20020 })],
      [
        candidate({ id: 1, exitPrice: null }),
        candidate({ id: 2, exitPrice: null }),
      ],
    );
    expect(matched[0]?.id).toBe(1);
    expect(matched[1]?.id).toBe(2);
  });
});

describe("matchRows — the occurrence counter", () => {
  it("skips one and creates two when the file repeats a scalp three times", () => {
    const matched = matchRows([row(), row(), row()], [candidate({ id: 1 })]);
    expect(matched[0]?.id).toBe(1);
    expect(matched[1]).toBeNull();
    expect(matched[2]).toBeNull();
  });

  it("leaves a journal trade alone when the file has fewer rows", () => {
    const matched = matchRows(
      [row()],
      [candidate({ id: 1 }), candidate({ id: 2 })],
    );
    expect(matched).toHaveLength(1);
    expect(matched[0]?.id).toBe(1);
  });

  it("keeps separate entry keys apart", () => {
    const matched = matchRows(
      [row({ entryPrice: 20000 }), row({ entryPrice: 20100 })],
      [
        candidate({ id: 1, entryPrice: 20100 }),
        candidate({ id: 2, entryPrice: 20000 }),
      ],
    );
    expect(matched[0]?.id).toBe(2);
    expect(matched[1]?.id).toBe(1);
  });

  it("has nothing to match against an empty journal", () => {
    expect(matchRows([row(), row()], [])).toEqual([null, null]);
  });

  it("has nothing to do with no rows", () => {
    expect(matchRows([], [candidate()])).toEqual([]);
  });
});

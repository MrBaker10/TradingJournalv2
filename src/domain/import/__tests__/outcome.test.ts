import { describe, expect, it } from "vitest";
import {
  BROKER_OWNED_FIELDS,
  decideOutcome,
  derivePoints,
  deriveResult,
  type ExistingTrade,
} from "../outcome.ts";
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

function existing(overrides: Partial<ExistingTrade> = {}): ExistingTrade {
  return {
    id: 7,
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
    ...overrides,
  };
}

describe("deriveResult", () => {
  it("reads the sign of the P&L", () => {
    expect(deriveResult(1)).toBe("Win");
    expect(deriveResult(-1)).toBe("Loss");
    expect(deriveResult(0)).toBe("Breakeven");
  });

  it("has no result for a trade that is still open", () => {
    expect(deriveResult(null)).toBeNull();
  });

  it("never derives Scratch", () => {
    // Scratch is a judgement about the execution, not a number. It only ever
    // arrives by hand.
    const derived = [1000, 1, 0, -1, -1000].map(deriveResult);
    expect(derived).not.toContain("Scratch");
  });
});

describe("derivePoints", () => {
  it("subtracts in the direction of the trade", () => {
    expect(derivePoints("long", 20000, 20050)).toBe(50);
    expect(derivePoints("short", 20050, 20000)).toBe(50);
  });

  it("goes negative on a losing trade", () => {
    expect(derivePoints("long", 20050, 20000)).toBe(-50);
    expect(derivePoints("short", 20000, 20050)).toBe(-50);
  });

  it("has no points without an exit", () => {
    expect(derivePoints("long", 20000, null)).toBeNull();
  });

  it("keeps the four decimals numeric(12,4) stores", () => {
    expect(derivePoints("long", 1.0001, 1.0004)).toBeCloseTo(0.0003, 10);
    expect(derivePoints("long", 20000.25, 20050.75)).toBe(50.5);
  });
});

describe("decideOutcome", () => {
  it("is new without a match", () => {
    expect(decideOutcome(row(), null).kind).toBe("new");
  });

  it("is a skip when every broker field already agrees", () => {
    const result = decideOutcome(row(), existing());
    expect(result.kind).toBe("skip");
  });

  it("ignores the seconds postgres hands back on a time", () => {
    // entry_time comes out of the driver as "09:30:00", the file says "09:30".
    const result = decideOutcome(
      row({ entryTime: "09:30", exitTime: "09:45" }),
      existing({ entryTime: "09:30:00", exitTime: "09:45:00" }),
    );
    expect(result.kind).toBe("skip");
  });

  it("updates when the exit arrives on a trade that was open", () => {
    const result = decideOutcome(
      row({ exitTime: "09:45", exitPrice: 20050 }),
      existing({ exitTime: null, exitPrice: null, points: null, result: null }),
    );

    expect(result.kind).toBe("update");
    if (result.kind !== "update") return;
    expect(result.tradeId).toBe(7);
    expect(result.changed).toEqual(
      expect.arrayContaining(["exitTime", "exitPrice", "points", "result"]),
    );
  });

  it("updates when a broker field changed value", () => {
    const result = decideOutcome(row({ contracts: 3 }), existing());
    expect(result.kind).toBe("update");
    if (result.kind !== "update") return;
    expect(result.changed).toContain("contracts");
  });

  it("names every broker field that differs, not just the first", () => {
    const result = decideOutcome(
      row({ contracts: 3, entryPrice: 19990 }),
      existing(),
    );
    if (result.kind !== "update") throw new Error("expected an update");
    expect(result.changed).toEqual(
      expect.arrayContaining(["contracts", "entryPrice"]),
    );
  });

  it("compares prices at the precision the column stores, not as floats", () => {
    // 20000.0000 out of postgres against 20000 from the file is not a change.
    const result = decideOutcome(
      row({ entryPrice: 20000 }),
      existing({ entryPrice: 20000.00001 }),
    );
    expect(result.kind).toBe("skip");
  });

  it("carries the derived points and result on an update", () => {
    const result = decideOutcome(
      row({ direction: "long", entryPrice: 20000, exitPrice: 19950 }),
      existing({ exitPrice: null, exitTime: null, points: null, result: null }),
    );

    if (result.kind !== "update") throw new Error("expected an update");
    expect(result.values.points).toBe(-50);
    expect(result.values.result).toBe("Loss");
  });

  it("touches no user-owned field", () => {
    // The whole point of the feature: the write set is exactly the broker
    // list, so nothing a user typed can be in it.
    const result = decideOutcome(row({ contracts: 9 }), existing());
    if (result.kind !== "update") throw new Error("expected an update");

    for (const field of Object.keys(result.values)) {
      expect(BROKER_OWNED_FIELDS).toContain(field);
    }
  });

  it("does not report a change when the file has no exit and the journal does", () => {
    // A fill-level file that ends mid-position must not wipe a closed trade.
    const result = decideOutcome(
      row({ exitTime: null, exitPrice: null }),
      existing(),
    );
    expect(result.kind).toBe("skip");
  });
});

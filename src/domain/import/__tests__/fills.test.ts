import { describe, expect, it } from "vitest";
import { pairFills } from "../fills.ts";
import type { ImportFill } from "../types.ts";

let nextId = 0;

// The counter is padded: an unpadded one produces "09:010:00", which sorts
// before "09:02:00" as a string and would order the fills wrongly from the
// tenth fill onwards.
function fill(overrides: Partial<ImportFill> = {}): ImportFill {
  nextId += 1;
  const minute = String(nextId % 60).padStart(2, "0");
  const hour = String(9 + Math.floor(nextId / 60)).padStart(2, "0");
  return {
    fillId: `f${nextId}`,
    orderId: null,
    symbol: "MNQ",
    direction: "long",
    contracts: 1,
    price: 100,
    timestamp: `2026-08-20 ${hour}:${minute}:00`,
    tradeDate: "2026-08-20",
    entryTime: `${hour}:${minute}`,
    sourceRow: nextId,
    ...overrides,
  };
}

describe("pairFills", () => {
  it("carries the entry order and every closing order onto the trip", () => {
    const [trade] = pairFills([
      fill({ orderId: "10", direction: "long", contracts: 2 }),
      fill({ orderId: "11", direction: "long", contracts: 1 }),
      fill({ orderId: "12", direction: "short", contracts: 1 }),
      fill({ orderId: "12", direction: "short", contracts: 1 }),
      fill({ orderId: "13", direction: "short", contracts: 1 }),
    ]);

    expect(trade.entryOrderId).toBe("10");
    expect(trade.exitOrderIds).toEqual(["12", "13"]);
  });

  it("pairs one buy with one sell into a long round trip", () => {
    const trades = pairFills([
      fill({
        fillId: "a",
        direction: "long",
        price: 20000,
        entryTime: "09:30",
      }),
      fill({
        fillId: "b",
        direction: "short",
        price: 20050,
        entryTime: "09:45",
      }),
    ]);

    expect(trades).toHaveLength(1);
    expect(trades[0]).toMatchObject({
      symbol: "MNQ",
      direction: "long",
      contracts: 1,
      entryPrice: 20000,
      exitPrice: 20050,
      entryTime: "09:30",
      exitTime: "09:45",
    });
  });

  it("pairs a sell opening into a short round trip", () => {
    const trades = pairFills([
      fill({ direction: "short", price: 20050, entryTime: "09:30" }),
      fill({ direction: "long", price: 20000, entryTime: "09:45" }),
    ]);

    expect(trades[0]).toMatchObject({
      direction: "short",
      entryPrice: 20050,
      exitPrice: 20000,
    });
  });

  it("closes a round trip only when the position returns to zero", () => {
    // Two entries, then one exit for each: one round trip of two contracts.
    const trades = pairFills([
      fill({ direction: "long", contracts: 1, price: 20000 }),
      fill({ direction: "long", contracts: 1, price: 20010 }),
      fill({ direction: "short", contracts: 2, price: 20050 }),
    ]);

    expect(trades).toHaveLength(1);
    expect(trades[0].contracts).toBe(2);
  });

  it("averages entry and exit price over the fills, weighted by size", () => {
    const trades = pairFills([
      fill({ direction: "long", contracts: 1, price: 20000 }),
      fill({ direction: "long", contracts: 3, price: 20100 }),
      fill({ direction: "short", contracts: 4, price: 20200 }),
    ]);

    // (1 * 20000 + 3 * 20100) / 4
    expect(trades[0].entryPrice).toBe(20075);
    expect(trades[0].exitPrice).toBe(20200);
    expect(trades[0].contracts).toBe(4);
  });

  it("splits a partial close into its own round trip, FIFO", () => {
    const trades = pairFills([
      fill({
        direction: "long",
        contracts: 2,
        price: 20000,
        entryTime: "09:30",
      }),
      fill({
        direction: "short",
        contracts: 1,
        price: 20050,
        entryTime: "09:40",
      }),
      fill({
        direction: "short",
        contracts: 1,
        price: 20080,
        entryTime: "09:50",
      }),
    ]);

    // Flat only after the second exit, so this is one round trip of two.
    expect(trades).toHaveLength(1);
    expect(trades[0].contracts).toBe(2);
    expect(trades[0].exitPrice).toBe(20065);
    expect(trades[0].exitTime).toBe("09:50");
  });

  it("starts a new round trip after the position went flat", () => {
    const trades = pairFills([
      fill({ direction: "long", price: 20000, entryTime: "09:30" }),
      fill({ direction: "short", price: 20050, entryTime: "09:45" }),
      fill({ direction: "long", price: 20100, entryTime: "10:30" }),
      fill({ direction: "short", price: 20150, entryTime: "10:45" }),
    ]);

    expect(trades).toHaveLength(2);
    expect(trades[0].entryTime).toBe("09:30");
    expect(trades[1].entryTime).toBe("10:30");
  });

  it("keeps instruments apart", () => {
    const trades = pairFills([
      fill({ symbol: "MNQ", direction: "long", price: 20000 }),
      fill({ symbol: "MES", direction: "long", price: 5000 }),
      fill({ symbol: "MNQ", direction: "short", price: 20050 }),
      fill({ symbol: "MES", direction: "short", price: 5010 }),
    ]);

    expect(trades).toHaveLength(2);
    expect(trades.map((trade) => trade.symbol).sort()).toEqual(["MES", "MNQ"]);
  });

  it("orders fills by timestamp, not by the order they arrived", () => {
    const trades = pairFills([
      fill({
        direction: "short",
        price: 20050,
        timestamp: "2026-08-20 09:45:00",
        entryTime: "09:45",
      }),
      fill({
        direction: "long",
        price: 20000,
        timestamp: "2026-08-20 09:30:00",
        entryTime: "09:30",
      }),
    ]);

    expect(trades[0]).toMatchObject({
      direction: "long",
      entryPrice: 20000,
      exitPrice: 20050,
    });
  });

  it("returns a position the file never closes as an open trade", () => {
    const trades = pairFills([
      fill({ direction: "long", price: 20000, entryTime: "09:30" }),
      fill({ direction: "short", price: 20050, entryTime: "09:45" }),
      fill({ direction: "long", price: 20100, entryTime: "15:30" }),
    ]);

    expect(trades).toHaveLength(2);
    expect(trades[1]).toMatchObject({
      entryPrice: 20100,
      entryTime: "15:30",
      exitPrice: null,
      exitTime: null,
    });
  });

  it("carries a flip through zero as two round trips", () => {
    // Long 1, then sell 2: the position closes the long and opens a short.
    const trades = pairFills([
      fill({
        direction: "long",
        contracts: 1,
        price: 20000,
        entryTime: "09:30",
      }),
      fill({
        direction: "short",
        contracts: 2,
        price: 20050,
        entryTime: "09:45",
      }),
      fill({
        direction: "long",
        contracts: 1,
        price: 20020,
        entryTime: "10:00",
      }),
    ]);

    expect(trades).toHaveLength(2);
    expect(trades[0]).toMatchObject({
      direction: "long",
      contracts: 1,
      exitPrice: 20050,
    });
    expect(trades[1]).toMatchObject({
      direction: "short",
      contracts: 1,
      entryPrice: 20050,
      exitPrice: 20020,
    });
  });

  it("hashes the fill ids into a broker key, stable against fill order", () => {
    const forward = pairFills([
      fill({
        fillId: "111",
        direction: "long",
        timestamp: "2026-08-20 09:30:00",
      }),
      fill({
        fillId: "222",
        direction: "short",
        timestamp: "2026-08-20 09:45:00",
      }),
    ]);
    const shuffled = pairFills([
      fill({
        fillId: "222",
        direction: "short",
        timestamp: "2026-08-20 09:45:00",
      }),
      fill({
        fillId: "111",
        direction: "long",
        timestamp: "2026-08-20 09:30:00",
      }),
    ]);

    expect(forward[0].brokerTradeKey).toBe(shuffled[0].brokerTradeKey);
    expect(forward[0].brokerTradeKey).toBeTruthy();
  });

  it("gives two different round trips two different keys", () => {
    const trades = pairFills([
      fill({ fillId: "1", direction: "long" }),
      fill({ fillId: "2", direction: "short" }),
      fill({ fillId: "3", direction: "long" }),
      fill({ fillId: "4", direction: "short" }),
    ]);

    expect(trades[0].brokerTradeKey).not.toBe(trades[1].brokerTradeKey);
  });

  it("dates a round trip by its entry, not its exit", () => {
    const trades = pairFills([
      fill({
        direction: "long",
        tradeDate: "2026-08-20",
        entryTime: "23:30",
        timestamp: "2026-08-20 23:30:00",
      }),
      fill({
        direction: "short",
        tradeDate: "2026-08-21",
        entryTime: "01:15",
        timestamp: "2026-08-21 01:15:00",
      }),
    ]);

    expect(trades[0].tradeDate).toBe("2026-08-20");
    expect(trades[0].exitTime).toBe("01:15");
  });

  it("has nothing to pair in an empty file", () => {
    expect(pairFills([])).toEqual([]);
  });
});

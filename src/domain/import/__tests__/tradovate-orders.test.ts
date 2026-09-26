import { describe, expect, it } from "vitest";
import { parseDelimited } from "../../../lib/csv/parse.ts";
import { detectOrders, detectShape } from "../detect.ts";
import { pairFills } from "../fills.ts";
import { normalizeFills } from "../normalize.ts";
import {
  applyOrderStops,
  readOrders,
  STOP_BEFORE_ENTRY,
  STOP_MOVED,
  STOP_PAST_ENTRY,
  STOPS_DISAGREE,
  type TradovateOrder,
} from "../tradovate-orders.ts";
import type { RawTrade } from "../types.ts";

// A real week, 14–18 Sep 2026: the fills export and the Orders export of the
// same account, verbatim apart from the account number.
const FILLS = `_id,_orderId,_contractId,_timestamp,_tradeDate,_action,_qty,_price,_active,_accountId,Fill ID,Order ID,Timestamp,Date,Account,B/S,Quantity,Price,_priceFormat,_priceFormatType,_tickSize,Contract,Product,Product Description,commission
621235571868,621235571865,4399654,2026-09-14 14:30:00.700Z,2026-09-14,0,2,29007.75,true,1000001,621235571868,621235571865,09/14/2026 16:30:00,9/14/26,DEMO0000001, Buy,2,29007.75,-2,0,0.25,MNQU6,MNQ,Micro E-mini NASDAQ-100,1.0
621235571884,621235571873,4399654,2026-09-14 14:36:34.443Z,2026-09-14,1,2,28971.0,true,1000001,621235571884,621235571873,09/14/2026 16:36:34,9/14/26,DEMO0000001, Sell,2,28971.00,-2,0,0.25,MNQU6,MNQ,Micro E-mini NASDAQ-100,1.0
621235571922,621235571919,4223861,2026-09-16 13:46:46.486Z,2026-09-16,0,3,4385.8,true,1000001,621235571922,621235571919,09/16/2026 15:46:46,9/16/26,DEMO0000001, Buy,3,4385.8,-1,0,0.1,MGCZ6,MGC,E-Micro Gold,2.4
621235571935,621235571927,4223861,2026-09-16 13:52:03.317Z,2026-09-16,1,3,4381.1,true,1000001,621235571935,621235571927,09/16/2026 15:52:03,9/16/26,DEMO0000001, Sell,3,4381.1,-1,0,0.1,MGCZ6,MGC,E-Micro Gold,2.4
621235571943,621235571940,4223861,2026-09-16 13:52:34.366Z,2026-09-16,1,4,4379.8,true,1000001,621235571943,621235571940,09/16/2026 15:52:34,9/16/26,DEMO0000001, Sell,4,4379.8,-1,0,0.1,MGCZ6,MGC,E-Micro Gold,3.2
621235571972,621235571953,4223861,2026-09-16 14:05:46.878Z,2026-09-16,0,4,4367.8,true,1000001,621235571972,621235571953,09/16/2026 16:05:46,9/16/26,DEMO0000001, Buy,4,4367.8,-1,0,0.1,MGCZ6,MGC,E-Micro Gold,3.2
621235571989,621235571986,4470324,2026-09-17 08:27:01.737Z,2026-09-17,0,2,29512.25,true,1000001,621235571989,621235571986,09/17/2026 10:27:01,9/17/26,DEMO0000001, Buy,2,29512.25,-2,0,0.25,MNQZ6,MNQ,Micro E-mini NASDAQ-100,1.0
621235572029,621235571993,4470324,2026-09-17 09:00:43.477Z,2026-09-17,1,2,29565.25,true,1000001,621235572029,621235571993,09/17/2026 11:00:43,9/17/26,DEMO0000001, Sell,2,29565.25,-2,0,0.25,MNQZ6,MNQ,Micro E-mini NASDAQ-100,1.0
621235572046,621235572043,4223861,2026-09-18 13:44:13.727Z,2026-09-18,1,2,4392.2,true,1000001,621235572046,621235572043,09/18/2026 15:44:13,9/18/26,DEMO0000001, Sell,2,4392.2,-1,0,0.1,MGCZ6,MGC,E-Micro Gold,1.6
621235572066,621235572052,4223861,2026-09-18 13:46:07.278Z,2026-09-18,0,2,4396.900000000001,true,1000001,621235572066,621235572052,09/18/2026 15:46:07,9/18/26,DEMO0000001, Buy,2,4396.9,-1,0,0.1,MGCZ6,MGC,E-Micro Gold,1.6
621235572095,621235572092,4223861,2026-09-18 13:56:24.119Z,2026-09-18,1,2,4390.1,true,1000001,621235572095,621235572092,09/18/2026 15:56:24,9/18/26,DEMO0000001, Sell,2,4390.1,-1,0,0.1,MGCZ6,MGC,E-Micro Gold,1.6
621235572134,621235572100,4223861,2026-09-18 14:42:34.506Z,2026-09-18,0,2,4393.400000000001,true,1000001,621235572134,621235572100,09/18/2026 16:42:34,9/18/26,DEMO0000001, Buy,2,4393.4,-1,0,0.1,MGCZ6,MGC,E-Micro Gold,1.6`;

const ORDERS = `orderId,Account,Order ID,B/S,Contract,Product,Product Description,avgPrice,filledQty,Fill Time,lastCommandId,Status,_priceFormat,_priceFormatType,_tickSize,spreadDefinitionId,Version ID,Timestamp,Date,Quantity,Text,Type,Limit Price,Stop Price,decimalLimit,decimalStop,Filled Qty,Avg Fill Price,decimalFillAvg,Venue,Notional Value,Currency
621235571865,DEMO0000001,621235571865, Buy,MNQU6,MNQ,Micro E-mini NASDAQ-100,29007.75,2,09/14/2026 16:30:00,621235571865, Filled,-2,0,0.25,,621235571865,09/14/2026 16:30:00,9/14/26,2,Tradingview, Market,,,,,2,29007.75,29007.75,,"116,031.00",USD
621235571873,DEMO0000001,621235571873, Sell,MNQU6,MNQ,Micro E-mini NASDAQ-100,28971.0,2,09/14/2026 16:36:34,621235571875, Filled,-2,0,0.25,,621235571875,09/14/2026 16:30:00,9/14/26,2,Tradingview, Stop,,28971.25,,28971.25,2,28971.00,28971.0,,"115,884.00",USD
621235571881,DEMO0000001,621235571881, Sell,MNQU6,MNQ,Micro E-mini NASDAQ-100,,,,621235571881, Canceled,-2,0,0.25,,621235571881,09/14/2026 16:35:02,9/14/26,2,Tradingview, Limit,29086.00,,29086.0,,,,,,,USD
621235571893,DEMO0000001,621235571893, Buy,MNQU6,MNQ,Micro E-mini NASDAQ-100,,,,621235571900, Canceled,-2,0,0.25,,621235571900,09/14/2026 16:45:09,9/14/26,2,Tradingview, Limit,28983.75,,28983.75,,,,,,,USD
621235571896,DEMO0000001,621235571896, Sell,MNQU6,MNQ,Micro E-mini NASDAQ-100,,,,621235571896, Canceled,-2,0,0.25,,621235571896,09/14/2026 16:45:03,9/14/26,2,Tradingview, Limit,29084.00,,29084.0,,,,,,,USD
621235571898,DEMO0000001,621235571898, Sell,MNQU6,MNQ,Micro E-mini NASDAQ-100,,,,621235571898, Canceled,-2,0,0.25,,621235571898,09/14/2026 16:45:03,9/14/26,2,Tradingview, Stop,,28956.50,,28956.5,,,,,,USD
621235571919,DEMO0000001,621235571919, Buy,MGCZ6,MGC,E-Micro Gold,4385.8,3,09/16/2026 15:46:46,621235571919, Filled,-1,0,0.1,,621235571919,09/16/2026 15:46:46,9/16/26,3,Tradingview, Market,,,,,3,4385.8,4385.8,,"131,574.00",USD
621235571927,DEMO0000001,621235571927, Sell,MGCZ6,MGC,E-Micro Gold,4381.1,3,09/16/2026 15:52:03,621235571929, Filled,-1,0,0.1,,621235571929,09/16/2026 15:46:46,9/16/26,3,Tradingview, Stop,,4381.2,,4381.2,3,4381.1,4381.1,,"131,433.00",USD
621235571940,DEMO0000001,621235571940, Sell,MGCZ6,MGC,E-Micro Gold,4379.8,4,09/16/2026 15:52:34,621235571940, Filled,-1,0,0.1,,621235571940,09/16/2026 15:52:34,9/16/26,4,Tradingview, Market,,,,,4,4379.8,4379.8,,"175,192.00",USD
621235571946,DEMO0000001,621235571946, Buy,MGCZ6,MGC,E-Micro Gold,,,,621235571964, Canceled,-1,0,0.1,,621235571964,09/16/2026 16:05:15,9/16/26,4,Tradingview, Stop,,4376.9,,4376.9,,,,,,USD
621235571953,DEMO0000001,621235571953, Buy,MGCZ6,MGC,E-Micro Gold,4367.8,4,09/16/2026 16:05:46,621235571968, Filled,-1,0,0.1,,621235571968,09/16/2026 16:05:30,9/16/26,4,Tradingview, Limit,4367.8,,4367.8,,4,4367.8,4367.8,,"174,712.00",USD
621235571986,DEMO0000001,621235571986, Buy,MNQZ6,MNQ,Micro E-mini NASDAQ-100,29512.25,2,09/17/2026 10:27:01,621235571986, Filled,-2,0,0.25,,621235571986,09/17/2026 10:27:01,9/17/26,2,Tradingview, Market,,,,,2,29512.25,29512.25,,"118,049.00",USD
621235571993,DEMO0000001,621235571993, Sell,MNQZ6,MNQ,Micro E-mini NASDAQ-100,29565.25,2,09/17/2026 11:00:43,621235572017, Filled,-2,0,0.25,,621235572017,09/17/2026 10:38:51,9/17/26,2,Tradingview, Limit,29565.25,,29565.25,,2,29565.25,29565.25,,"118,261.00",USD
621235571995,DEMO0000001,621235571995, Sell,MNQZ6,MNQ,Micro E-mini NASDAQ-100,,,,621235572025, Canceled,-2,0,0.25,,621235572025,09/17/2026 10:54:20,9/17/26,2,Tradingview, Stop,,29533.00,,29533.0,,,,,,USD
621235572043,DEMO0000001,621235572043, Sell,MGCZ6,MGC,E-Micro Gold,4392.2,2,09/18/2026 15:44:13,621235572043, Filled,-1,0,0.1,,621235572043,09/18/2026 15:44:13,9/18/26,2,Tradingview, Market,,,,,2,4392.2,4392.2,,"87,844.00",USD
621235572050,DEMO0000001,621235572050, Buy,MGCZ6,MGC,E-Micro Gold,,,,621235572058, Canceled,-1,0,0.1,,621235572058,09/18/2026 15:44:13,9/18/26,2,Tradingview, Limit,4373.0,,4373.0,,,,,,,USD
621235572052,DEMO0000001,621235572052, Buy,MGCZ6,MGC,E-Micro Gold,4396.900000000001,2,09/18/2026 15:46:07,621235572054, Filled,-1,0,0.1,,621235572054,09/18/2026 15:44:13,9/18/26,2,Tradingview, Stop,,4396.8,,4396.8,2,4396.9,4396.900000000001,,"87,938.00",USD
621235572075,DEMO0000001,621235572075, Sell,MGCZ6,MGC,E-Micro Gold,,,,621235572075, Canceled,-1,0,0.1,,621235572075,09/18/2026 15:54:16,9/18/26,2,Tradingview, Limit,4390.1,,4390.1,,,,,,,USD
621235572078,DEMO0000001,621235572078, Buy,MGCZ6,MGC,E-Micro Gold,,,,621235572078, Canceled,-1,0,0.1,,621235572078,09/18/2026 15:54:16,9/18/26,2,Tradingview, Limit,4373.3,,4373.3,,,,,,,USD
621235572080,DEMO0000001,621235572080, Buy,MGCZ6,MGC,E-Micro Gold,,,,621235572080, Canceled,-1,0,0.1,,621235572080,09/18/2026 15:54:16,9/18/26,2,Tradingview, Stop,,4396.1,,4396.1,,,,,,USD
621235572092,DEMO0000001,621235572092, Sell,MGCZ6,MGC,E-Micro Gold,4390.1,2,09/18/2026 15:56:24,621235572092, Filled,-1,0,0.1,,621235572092,09/18/2026 15:56:24,9/18/26,2,Tradingview, Market,,,,,2,4390.1,4390.1,,"87,802.00",USD
621235572098,DEMO0000001,621235572098, Buy,MGCZ6,MGC,E-Micro Gold,,,,621235572130, Canceled,-1,0,0.1,,621235572130,09/18/2026 16:31:03,9/18/26,2,Tradingview, Limit,4362.6,,4362.6,,,,,,,USD
621235572100,DEMO0000001,621235572100, Buy,MGCZ6,MGC,E-Micro Gold,4393.400000000001,2,09/18/2026 16:42:34,621235572126, Filled,-1,0,0.1,,621235572126,09/18/2026 16:30:32,9/18/26,2,Tradingview, Stop,,4393.3,,4393.3,2,4393.4,4393.400000000001,,"87,868.00",USD`;

function weekTrades(): RawTrade[] {
  const [header, ...rows] = parseDelimited(FILLS);
  const detected = detectShape(header);
  if (detected.shape !== "fills") throw new Error("not a fills export");
  const { fills } = normalizeFills(rows, detected.columns, "Europe/Berlin");
  return pairFills(fills);
}

function weekOrders(): TradovateOrder[] {
  const [header, ...rows] = parseDelimited(ORDERS);
  const columns = detectOrders(header);
  if (columns === null) throw new Error("not an Orders export");
  return readOrders(rows, columns);
}

function byEntry(trades: RawTrade[]) {
  return trades
    .map((trade) => ({
      symbol: trade.symbol,
      tradeDate: trade.tradeDate,
      entryTime: trade.entryTime,
      stopPrice: trade.stopPrice,
      stopNotice: trade.stopNotice,
    }))
    .sort((a, b) =>
      `${a.tradeDate} ${a.entryTime}`.localeCompare(
        `${b.tradeDate} ${b.entryTime}`,
      ),
    );
}

describe("applyOrderStops — the real week", () => {
  it("takes the three untouched stops and names the three moved ones", () => {
    const result = applyOrderStops(weekTrades(), weekOrders());

    expect(byEntry(result)).toEqual([
      {
        symbol: "MNQU6",
        tradeDate: "2026-09-14",
        entryTime: "16:30:00",
        stopPrice: 28971.25,
        stopNotice: null,
      },
      {
        symbol: "MGCZ6",
        tradeDate: "2026-09-16",
        entryTime: "15:46:46",
        stopPrice: 4381.2,
        stopNotice: null,
      },
      {
        // Trailed into profit 13 minutes in, then cancelled by the target.
        symbol: "MGCZ6",
        tradeDate: "2026-09-16",
        entryTime: "15:52:34",
        stopPrice: null,
        stopNotice: STOP_MOVED,
      },
      {
        symbol: "MNQZ6",
        tradeDate: "2026-09-17",
        entryTime: "10:27:01",
        stopPrice: null,
        stopNotice: STOP_MOVED,
      },
      {
        // The bracket of a cancelled limit entry at 15:54 lies between this
        // trade and the next one and must not be taken for either.
        symbol: "MGCZ6",
        tradeDate: "2026-09-18",
        entryTime: "15:44:13",
        stopPrice: 4396.8,
        stopNotice: null,
      },
      {
        // Still on the loss side, but changed 34 minutes after the entry: it
        // may have been tightened, so it is not the initial stop.
        symbol: "MGCZ6",
        tradeDate: "2026-09-18",
        entryTime: "15:56:24",
        stopPrice: null,
        stopNotice: STOP_MOVED,
      },
    ]);
  });

  it("changes nothing without an Orders export", () => {
    const trades = weekTrades();
    expect(applyOrderStops(trades, [])).toEqual(trades);
  });
});

describe("readOrders", () => {
  it("reads the display times as sortable strings, unconverted", () => {
    const stop = weekOrders().find((order) => order.orderId === "621235571873");
    expect(stop).toEqual({
      orderId: "621235571873",
      side: "short",
      contract: "MNQU6",
      isStop: true,
      stopPrice: 28971.25,
      fillTime: "2026-09-14 16:36:34",
      lastChange: "2026-09-14 16:30:00",
    });
  });

  it("drops a row it cannot place", () => {
    const [header, row] = parseDelimited(ORDERS);
    const columns = detectOrders(header);
    if (columns === null) throw new Error("not an Orders export");
    const broken = [...row];
    broken[columns.lastChange] = "yesterday";
    expect(readOrders([broken], columns)).toEqual([]);
  });
});

// Hand-built cases for the rules the real week does not exercise.

function trip(overrides: Partial<RawTrade> = {}): RawTrade {
  return {
    symbol: "MNQZ6",
    direction: "long",
    contracts: 1,
    tradeDate: "2026-09-21",
    entryTime: "15:30:00",
    entryPrice: 20000,
    exitTime: "15:40:00",
    exitPrice: 19990,
    brokerTradeKey: null,
    filePnlCents: null,
    stopPrice: null,
    stopNotice: null,
    entryOrderId: "100",
    exitOrderIds: ["102"],
    sourceRow: 2,
    ...overrides,
  };
}

function order(overrides: Partial<TradovateOrder>): TradovateOrder {
  return {
    orderId: "0",
    side: "short",
    contract: "MNQZ6",
    isStop: false,
    stopPrice: null,
    fillTime: null,
    lastChange: "2026-09-21 15:30:00",
    ...overrides,
  };
}

const ENTRY = order({
  orderId: "100",
  side: "long",
  fillTime: "2026-09-21 15:30:00",
});
const EXIT = order({ orderId: "102", fillTime: "2026-09-21 15:40:00" });

function stop(overrides: Partial<TradovateOrder>): TradovateOrder {
  return order({
    orderId: "101",
    isStop: true,
    stopPrice: 19990,
    ...overrides,
  });
}

describe("applyOrderStops — rules", () => {
  it("takes a stop last changed in the entry second", () => {
    const [result] = applyOrderStops([trip()], [ENTRY, stop({}), EXIT]);
    expect(result.stopPrice).toBe(19990);
    expect(result.stopNotice).toBeNull();
  });

  it("does not stretch the entry second by even one", () => {
    const [result] = applyOrderStops(
      [trip()],
      [ENTRY, stop({ lastChange: "2026-09-21 15:30:01" }), EXIT],
    );
    expect(result.stopPrice).toBeNull();
    expect(result.stopNotice).toBe(STOP_MOVED);
  });

  it("does not take a stop placed before a limit entry filled", () => {
    const [result] = applyOrderStops(
      [trip()],
      [ENTRY, stop({ lastChange: "2026-09-21 15:20:00" }), EXIT],
    );
    expect(result.stopPrice).toBeNull();
    expect(result.stopNotice).toBe(STOP_BEFORE_ENTRY);
  });

  it("does not take a stop on or past the entry", () => {
    const [result] = applyOrderStops(
      [trip()],
      [ENTRY, stop({ stopPrice: 20000 }), EXIT],
    );
    expect(result.stopPrice).toBeNull();
    expect(result.stopNotice).toBe(STOP_PAST_ENTRY);
  });

  it("reads the loss side the other way round for a short", () => {
    const short = trip({ direction: "short", exitPrice: 20010 });
    const shortEntry = order({ ...ENTRY, side: "short" });
    const buyStop = stop({ side: "long", stopPrice: 20010 });
    const exit = order({ ...EXIT, side: "long" });

    const [result] = applyOrderStops([short], [shortEntry, buyStop, exit]);
    expect(result.stopPrice).toBe(20010);
  });

  it("keeps the initial stop when a later one replaced it", () => {
    const [result] = applyOrderStops(
      [trip()],
      [
        ENTRY,
        stop({}),
        stop({
          orderId: "103",
          stopPrice: 19995,
          lastChange: "2026-09-21 15:35:00",
        }),
        EXIT,
      ],
    );
    expect(result.stopPrice).toBe(19990);
  });

  it("does not choose between two different stops at entry", () => {
    const [result] = applyOrderStops(
      [trip()],
      [ENTRY, stop({}), stop({ orderId: "103", stopPrice: 19980 }), EXIT],
    );
    expect(result.stopPrice).toBeNull();
    expect(result.stopNotice).toBe(STOPS_DISAGREE);
  });

  it("ignores a stop on the same side, another contract or before the entry", () => {
    const [result] = applyOrderStops(
      [trip()],
      [
        ENTRY,
        stop({ side: "long" }),
        stop({ contract: "MESZ6" }),
        stop({ orderId: "99" }),
        EXIT,
      ],
    );
    expect(result.stopPrice).toBeNull();
    expect(result.stopNotice).toBeNull();
  });

  it("ignores a stop last changed after the trade closed", () => {
    const [result] = applyOrderStops(
      [trip()],
      [
        ENTRY,
        stop({ orderId: "103", lastChange: "2026-09-21 15:45:00" }),
        EXIT,
      ],
    );
    expect(result.stopNotice).toBeNull();
  });

  it("leaves the stop orders of the next trade to the next trade", () => {
    const next = trip({
      entryOrderId: "200",
      exitOrderIds: ["202"],
      entryTime: "16:00:00",
      exitTime: null,
      exitPrice: null,
      sourceRow: 4,
    });
    const nextEntry = order({
      orderId: "200",
      side: "long",
      fillTime: "2026-09-21 16:00:00",
      lastChange: "2026-09-21 16:00:00",
    });
    const nextStop = stop({
      orderId: "201",
      stopPrice: 19900,
      lastChange: "2026-09-21 16:00:00",
    });

    const [first, second] = applyOrderStops(
      [trip({ exitOrderIds: [] }), next],
      [ENTRY, nextEntry, nextStop],
    );
    expect(first.stopNotice).toBeNull();
    expect(second.stopPrice).toBe(19900);
  });

  it("leaves a trade alone whose entry order is not in the export", () => {
    const earlier = trip({ entryOrderId: "50" });
    expect(applyOrderStops([earlier], [ENTRY, stop({}), EXIT])).toEqual([
      earlier,
    ]);
  });

  it("never replaces a stop the trade already has", () => {
    const withStop = trip({ stopPrice: 19985 });
    expect(applyOrderStops([withStop], [ENTRY, stop({}), EXIT])).toEqual([
      withStop,
    ]);
  });
});

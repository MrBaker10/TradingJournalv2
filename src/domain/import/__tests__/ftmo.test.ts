import { describe, expect, it } from "vitest";
import { detectShape, type FtmoColumns } from "../detect.ts";
import { readFtmoRows } from "../ftmo.ts";

const HEADER =
  "Ticket;Öffnen;Typ;Lots;Symbol;Preis;SL;TP;Schließung;Preis;Swap;Kommission;Gewinn;Pips;Dauer des Trades in Sekunden";

function columnsOf(header: string): FtmoColumns {
  const detected = detectShape(header.split(";"));
  if (detected.shape !== "ftmo") throw new Error("not an FTMO export");
  return detected.columns;
}

const COLUMNS = columnsOf(HEADER);
const BERLIN = "Europe/Berlin";

// Real rows from tmp/import-samples/ftmo.csv, verbatim.
const US100_SELL =
  "56216539;2026-09-24 11:20:09;sell;15,00000000;US100.cash;30191,72000000;30205,96000000;30184,01000000;2026-09-24 11:20:48;30187,38000000;0,00000000;0,00000000;56,76000000;4,30000000;39";
const US30_NO_SL =
  "56217015;2026-09-24 11:26:48;sell;6,00000000;US30.cash;51269,88000000;;;2026-09-24 11:27:00;51262,02000000;0,00000000;0,00000000;41,12000000;7,90000000;12";
const GOLD_WITH_COMMISSION =
  "56144094;2026-09-22 18:26:38;sell;0,05000000;XAUUSD;4334,78000000;4334,72000000;4327,40000000;2026-09-22 18:44:47;4328,21000000;0,00000000;-0,26000000;28,53000000;6,60000000;1089";
const STOP_PAST_ENTRY =
  "56128064;2026-09-22 14:42:19;sell;1,59000000;US100.cash;30497,28000000;30497,00000000;30478,76000000;2026-09-22 14:54:16;30478,73000000;0,00000000;0,00000000;25,55000000;18,60000000;717";
const FRACTIONAL_BUY =
  "56216322;2026-09-24 11:17:07;buy;7,56000000;US100.cash;30203,38000000;30203,66000000;30219,34000000;2026-09-24 11:18:04;30204,03000000;0,00000000;0,00000000;4,28000000;0,70000000;57";

function read(line: string, timeZone = BERLIN) {
  return readFtmoRows([line.split(";")], COLUMNS, timeZone);
}

function readOne(line: string, timeZone = BERLIN) {
  const { trades, invalid } = read(line, timeZone);
  expect(invalid).toEqual([]);
  return trades[0];
}

function withField(line: string, index: number, value: string): string {
  const fields = line.split(";");
  fields[index] = value;
  return fields.join(";");
}

describe("readFtmoRows", () => {
  it("reads one row as a whole round trip", () => {
    expect(readOne(US100_SELL)).toEqual({
      symbol: "US100.CASH",
      direction: "short",
      contracts: 15,
      tradeDate: "2026-09-24",
      entryTime: "11:20:09",
      entryPrice: 30191.72,
      exitTime: "11:20:48",
      exitPrice: 30187.38,
      brokerTradeKey: "56216539",
      filePnlCents: 5676,
      stopPrice: 30205.96,
      stopNotice: null,
      sourceRow: 2,
    });
  });

  it("reads fractional lots with a decimal comma", () => {
    expect(readOne(FRACTIONAL_BUY)).toMatchObject({
      direction: "long",
      contracts: 7.56,
    });
    expect(readOne(GOLD_WITH_COMMISSION).contracts).toBe(0.05);
  });

  it("adds commission and swap to the profit, exactly", () => {
    // 28.53 - 0.26 + 0 = 28.27
    expect(readOne(GOLD_WITH_COMMISSION).filePnlCents).toBe(2827);
  });

  it("adds a swap too", () => {
    const withSwap = withField(GOLD_WITH_COMMISSION, 10, "-1,05000000");
    expect(readOne(withSwap).filePnlCents).toBe(2722);
  });

  it("keeps the Berlin clock for a trader in Berlin", () => {
    const trade = readOne(US30_NO_SL);
    expect(trade.entryTime).toBe("11:26:48");
    expect(trade.exitTime).toBe("11:27:00");
  });

  it("converts the Berlin clock once into the trader's own zone", () => {
    // 11:26:48 CEST is 05:26:48 in New York (EDT).
    const trade = readOne(US30_NO_SL, "America/New_York");
    expect(trade.tradeDate).toBe("2026-09-24");
    expect(trade.entryTime).toBe("05:26:48");
    expect(trade.exitTime).toBe("05:27:00");
  });

  it("takes the date from the converted instant, not from the file", () => {
    const late = withField(US30_NO_SL, 1, "2026-09-24 01:30:00");
    expect(readOne(late, "America/New_York")).toMatchObject({
      tradeDate: "2026-09-23",
      entryTime: "19:30:00",
    });
  });

  it("takes an SL on the loss side as the stop", () => {
    // A sell with SL above the entry.
    expect(readOne(US100_SELL).stopPrice).toBe(30205.96);
    // A buy with SL below the entry.
    const buy = withField(FRACTIONAL_BUY, 6, "30190,00000000");
    expect(readOne(buy).stopPrice).toBe(30190);
  });

  it("leaves out an SL moved to or past the entry, and says why", () => {
    expect(readOne(STOP_PAST_ENTRY)).toMatchObject({
      stopPrice: null,
      stopNotice: "SL at or past entry — not imported",
    });
    // A buy with SL above the entry.
    expect(readOne(FRACTIONAL_BUY)).toMatchObject({
      stopPrice: null,
      stopNotice: "SL at or past entry — not imported",
    });
    const onEntry = withField(US100_SELL, 6, "30191,72000000");
    expect(readOne(onEntry).stopPrice).toBeNull();
  });

  it("says so when the file has no SL", () => {
    expect(readOne(US30_NO_SL)).toMatchObject({
      stopPrice: null,
      stopNotice: "no SL in the file — not imported",
    });
  });

  it("numbers rows from the first data line", () => {
    const { trades } = readFtmoRows(
      [US100_SELL.split(";"), US30_NO_SL.split(";")],
      COLUMNS,
      BERLIN,
    );
    expect(trades.map((trade) => trade.sourceRow)).toEqual([2, 3]);
  });
});

describe("readFtmoRows — rows it cannot read", () => {
  it.each([
    [0, "", "no ticket"],
    [4, "", "no symbol"],
    [2, "balance", 'cannot read buy or sell: "balance"'],
    [3, "0,00000000", 'cannot read lots: "0,00000000"'],
    [3, "1,000005", 'cannot read lots: "1,000005"'],
    [3, "1.5", 'cannot read lots: "1.5"'],
    [5, "abc", 'cannot read open price: "abc"'],
    [1, "24.09.2026 11:20", 'cannot read open time: "24.09.2026 11:20"'],
    [1, "2026-02-31 11:20:09", 'cannot read open time: "2026-02-31 11:20:09"'],
    [9, "", 'cannot read close price: ""'],
    [6, "x", 'cannot read SL: "x"'],
    [12, "56.76", 'cannot read amount: "56.76"'],
  ])("column %i = %j → %s", (index, value, reason) => {
    const { trades, invalid } = read(withField(US100_SELL, index, value));
    expect(trades).toEqual([]);
    expect(invalid).toEqual([{ sourceRow: 2, reason }]);
  });

  it("goes on with the rest of the file", () => {
    const { trades, invalid } = readFtmoRows(
      [withField(US100_SELL, 0, "").split(";"), US30_NO_SL.split(";")],
      COLUMNS,
      BERLIN,
    );
    expect(trades).toHaveLength(1);
    expect(invalid).toEqual([{ sourceRow: 2, reason: "no ticket" }]);
  });
});

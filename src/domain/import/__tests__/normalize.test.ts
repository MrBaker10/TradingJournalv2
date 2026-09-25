import { describe, expect, it } from "vitest";
import type { FillColumns } from "../detect.ts";
import {
  fromWallClock,
  type InstrumentRef,
  normalizeFills,
  normalizeTrades,
} from "../normalize.ts";
import type { RawTrade } from "../types.ts";

const BERLIN = "Europe/Berlin";

// The column layout of a Tradovate fills export, as detectShape reports it.
const COLUMNS: FillColumns = {
  fillId: 0,
  timestamp: 3,
  action: 5,
  quantity: 6,
  price: 7,
  contract: 21,
};

// A real row from the sample export, verbatim.
const REAL_ROW =
  "621235570008,621235570005,4399654,2026-08-13 15:57:01.616Z,2026-08-13,0,2,30130.25,true,61958149,621235570008,621235570005,08/13/2026 17:57:01,8/13/26,LFE02577923750004, Buy,2,30130.25,-2,0,0.25,MNQU6,MNQ,Micro E-mini NASDAQ-100,1.0";

function row(overrides: Record<number, string> = {}): string[] {
  const fields = REAL_ROW.split(",").map((field) => field.trim());
  for (const [index, value] of Object.entries(overrides)) {
    fields[Number(index)] = value;
  }
  return fields;
}

const INSTRUMENTS: InstrumentRef[] = [
  { id: 8, symbol: "MNQ", tickSize: 0.25 },
  { id: 7, symbol: "MES", tickSize: 0.25 },
  { id: 10, symbol: "M2K", tickSize: 0.1 },
  { id: 11, symbol: "MGC", tickSize: 0.1 },
];

function trade(overrides: Partial<RawTrade> = {}): RawTrade {
  return {
    symbol: "MNQU6",
    direction: "long",
    contracts: 2,
    tradeDate: "2026-08-13",
    entryTime: "17:57:01",
    entryPrice: 30130.25,
    exitTime: "18:25:20",
    exitPrice: 30176.75,
    brokerTradeKey: "621235570008",
    filePnlCents: null,
    stopPrice: null,
    stopNotice: null,
    sourceRow: 2,
    ...overrides,
  };
}

describe("normalizeFills", () => {
  it("reads a real row into a fill", () => {
    const { fills, invalid } = normalizeFills([row()], COLUMNS, BERLIN);

    expect(invalid).toEqual([]);
    expect(fills[0]).toEqual({
      fillId: "621235570008",
      symbol: "MNQU6",
      direction: "long",
      contracts: 2,
      price: 30130.25,
      timestamp: "2026-08-13T15:57:01.616Z",
      tradeDate: "2026-08-13",
      entryTime: "17:57:01",
      sourceRow: 2,
    });
  });

  it("puts the entry time on the trader's clock, not UTC", () => {
    // The broker reports 15:57 UTC. The trader sits in Berlin and read 17:57
    // off the chart, so that is what the journal has to show.
    const { fills } = normalizeFills([row()], COLUMNS, BERLIN);
    expect(fills[0].entryTime).toBe("17:57:01");

    const utc = normalizeFills([row()], COLUMNS, "UTC");
    expect(utc.fills[0].entryTime).toBe("15:57:01");
  });

  it("takes the date from the converted instant, not from the file", () => {
    // 23:30 UTC is already the next day in Berlin. The file's own `_tradeDate`
    // column still says the 13th; using it would print a date that disagrees
    // with the time beside it.
    const late = row({ 3: "2026-08-13 23:30:00.000Z" });
    const { fills } = normalizeFills([late], COLUMNS, BERLIN);

    expect(fills[0].tradeDate).toBe("2026-08-14");
    expect(fills[0].entryTime).toBe("01:30:00");
  });

  it("keeps the sortable timestamp in UTC", () => {
    // fills.ts orders fills by this string. Keeping it in UTC is what makes
    // the order survive a day boundary and a summer-time changeover.
    const { fills } = normalizeFills(
      [row({ 3: "2026-08-13 23:30:00.000Z" })],
      COLUMNS,
      BERLIN,
    );
    expect(fills[0].timestamp).toBe("2026-08-13T23:30:00.000Z");
  });

  it("reads a sell as short, from either column", () => {
    expect(
      normalizeFills([row({ 5: "1" })], COLUMNS, BERLIN).fills[0].direction,
    ).toBe("short");
    expect(
      normalizeFills([row({ 5: "Sell" })], COLUMNS, BERLIN).fills[0].direction,
    ).toBe("short");
  });

  it("numbers rows the way a spreadsheet does", () => {
    const { fills } = normalizeFills([row(), row(), row()], COLUMNS, BERLIN);
    expect(fills.map((fill) => fill.sourceRow)).toEqual([2, 3, 4]);
  });

  describe("rows it cannot read", () => {
    it("names the reason and the value", () => {
      const { fills, invalid } = normalizeFills(
        [
          row({ 0: "" }),
          row({ 5: "maybe" }),
          row({ 6: "1.5" }),
          row({ 7: "0" }),
          row({ 3: "not a time" }),
        ],
        COLUMNS,
        BERLIN,
      );

      expect(fills).toEqual([]);
      expect(invalid.map((entry) => entry.reason)).toEqual([
        "no fill id",
        'cannot read buy or sell: "maybe"',
        'cannot read quantity: "1.5"',
        'cannot read price: "0"',
        'cannot read time: "not a time"',
      ]);
    });

    it("does not block the rows around them", () => {
      const { fills, invalid } = normalizeFills(
        [row(), row({ 7: "" }), row()],
        COLUMNS,
        BERLIN,
      );

      expect(fills.map((fill) => fill.sourceRow)).toEqual([2, 4]);
      expect(invalid).toEqual([
        { sourceRow: 3, reason: 'cannot read price: ""' },
      ]);
    });
  });
});

describe("normalizeTrades", () => {
  it("resolves a contract to its journal instrument", () => {
    const { rows, invalid } = normalizeTrades([trade()], INSTRUMENTS);

    expect(invalid).toEqual([]);
    expect(rows[0]).toMatchObject({ instrumentId: 8, sourceRow: 2 });
  });

  it("strips the contract month from every symbol in the sample file", () => {
    const symbols = ["MNQU6", "MNQZ6", "MESU6", "MGCZ6"];
    const { rows } = normalizeTrades(
      symbols.map((symbol) => trade({ symbol })),
      INSTRUMENTS,
    );

    expect(rows.map((entry) => entry.instrumentId)).toEqual([8, 8, 7, 11]);
  });

  it("keeps a digit that belongs to the product name", () => {
    // M2KZ6 has to split as M2K + Z6. A greedy or naive split would leave M
    // or M2, and neither is an instrument.
    const { rows, invalid } = normalizeTrades(
      [trade({ symbol: "M2KZ6" })],
      INSTRUMENTS,
    );

    expect(invalid).toEqual([]);
    expect(rows[0].instrumentId).toBe(10);
  });

  it("accepts a symbol that carries no contract month", () => {
    const { rows } = normalizeTrades([trade({ symbol: "MNQ" })], INSTRUMENTS);
    expect(rows[0].instrumentId).toBe(8);
  });

  it("rejects an unknown symbol by name instead of inventing an instrument", () => {
    // An instrument without a real point value would falsify every P&L
    // figure computed from it.
    const { rows, invalid } = normalizeTrades(
      [trade({ symbol: "MCLZ6" })],
      INSTRUMENTS,
    );

    expect(rows).toEqual([]);
    expect(invalid).toEqual([
      { sourceRow: 2, reason: "unknown symbol: MCLZ6" },
    ]);
  });

  it("snaps prices to the instrument's tick", () => {
    // A weighted average over several fills lands between ticks by
    // construction: 29647.6667 is not a price MNQ ever traded at.
    const { rows } = normalizeTrades(
      [trade({ entryPrice: 29647.6667, exitPrice: 30130.3 })],
      INSTRUMENTS,
    );

    expect(rows[0].entryPrice).toBe(29647.75);
    expect(rows[0].exitPrice).toBe(30130.25);
  });

  it("snaps on the instrument's own tick, not a shared one", () => {
    const { rows } = normalizeTrades(
      [trade({ symbol: "MGCZ6", entryPrice: 2456.37 })],
      INSTRUMENTS,
    );

    expect(rows[0].entryPrice).toBe(2456.4);
  });

  it("leaves an open position without an exit", () => {
    const { rows } = normalizeTrades(
      [trade({ exitPrice: null, exitTime: null })],
      INSTRUMENTS,
    );

    expect(rows[0].exitPrice).toBeNull();
    expect(rows[0].exitTime).toBeNull();
  });

  it("carries the broker key and the file's P&L through untouched", () => {
    const { rows } = normalizeTrades(
      [trade({ brokerTradeKey: "a|b", filePnlCents: 9300 })],
      INSTRUMENTS,
    );

    expect(rows[0]).toMatchObject({
      brokerTradeKey: "a|b",
      filePnlCents: 9300,
    });
  });
});

describe("fromWallClock", () => {
  it("leaves a Berlin time alone for a trader in Berlin", () => {
    expect(fromWallClock("2026-09-24 11:26:48", BERLIN, BERLIN)).toEqual({
      tradeDate: "2026-09-24",
      time: "11:26:48",
    });
  });

  it("converts across a summer-time changeover by the instant", () => {
    // Clocks go back at 03:00 CEST on 2026-10-25; 03:30 CET after that is 02:30 UTC.
    expect(fromWallClock("2026-10-25 03:30:00", BERLIN, "UTC")).toEqual({
      tradeDate: "2026-10-25",
      time: "02:30:00",
    });
  });

  it("rejects anything that is not a full wall-clock timestamp", () => {
    expect(fromWallClock("2026-09-24", BERLIN, BERLIN)).toBeNull();
    expect(fromWallClock("2026-13-01 10:00:00", BERLIN, BERLIN)).toBeNull();
  });
});

describe("normalizeTrades — CFD symbols", () => {
  const CFDS: InstrumentRef[] = [
    { id: 20, symbol: "US100.cash", tickSize: 0.01 },
    { id: 21, symbol: "XAUUSD", tickSize: 0.01 },
  ];

  it("resolves a CFD symbol directly, with no contract month to strip", () => {
    const { rows, invalid } = normalizeTrades(
      [
        trade({ symbol: "US100.CASH", contracts: 1.88, entryPrice: 30191.72 }),
        trade({ symbol: "XAUUSD", contracts: 0.05, entryPrice: 4334.78 }),
      ],
      CFDS,
    );
    expect(invalid).toEqual([]);
    expect(rows.map((row) => [row.instrumentId, row.contracts])).toEqual([
      [20, 1.88],
      [21, 0.05],
    ]);
  });

  it("snaps the stop to the tick and carries the notice", () => {
    const { rows } = normalizeTrades(
      [
        trade({
          symbol: "US100.CASH",
          stopPrice: 30205.964,
          stopNotice: null,
          filePnlCents: 5676,
        }),
      ],
      CFDS,
    );
    expect(rows[0]).toMatchObject({ stopPrice: 30205.96, filePnlCents: 5676 });
  });
});

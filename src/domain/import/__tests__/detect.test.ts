import { describe, expect, it } from "vitest";
import { detectOrders, detectShape, type FillColumns } from "../detect.ts";

function fillColumns(header: string[]): FillColumns {
  const detected = detectShape(header);
  if (detected.shape !== "fills") throw new Error("not a fills export");
  return detected.columns;
}

// The header row of a real Tradovate fills export, verbatim.
const TRADOVATE_HEADER = [
  "_id",
  "_orderId",
  "_contractId",
  "_timestamp",
  "_tradeDate",
  "_action",
  "_qty",
  "_price",
  "_active",
  "_accountId",
  "Fill ID",
  "Order ID",
  "Timestamp",
  "Date",
  "Account",
  "B/S",
  "Quantity",
  "Price",
  "_priceFormat",
  "_priceFormatType",
  "_tickSize",
  "Contract",
  "Product",
  "Product Description",
  "commission",
];

describe("detectShape", () => {
  it("recognises a Tradovate fills export", () => {
    expect(detectShape(TRADOVATE_HEADER)).toEqual({
      shape: "fills",
      columns: {
        fillId: 0,
        timestamp: 3,
        action: 5,
        quantity: 6,
        price: 7,
        contract: 21,
        orderId: 1,
      },
    });
  });

  it("still recognises a fills export without _orderId", () => {
    const columns = fillColumns(
      TRADOVATE_HEADER.filter((name) => name !== "_orderId"),
    );
    expect(columns.orderId).toBeNull();
  });

  it("points at the machine columns, not the display ones", () => {
    // `Fill ID` (10) and `Timestamp` (12) hold the same values formatted for
    // a human, and `Timestamp` is rendered in whatever zone the platform is
    // set to. Reading those would make the import depend on a setting the
    // file never states.
    const columns = fillColumns(TRADOVATE_HEADER);
    expect(columns.fillId).toBe(0);
    expect(columns.timestamp).toBe(3);
  });

  it("ignores case and padding in the header", () => {
    const columns = fillColumns(
      TRADOVATE_HEADER.map((name) => ` ${name.toUpperCase()} `),
    );
    expect(columns.contract).toBe(21);
  });

  it("names what is missing and what was found", () => {
    const withoutTimestamp = TRADOVATE_HEADER.filter(
      (name) => name !== "_timestamp",
    );

    expect(() => detectShape(withoutTimestamp)).toThrow(/missing: _timestamp/);
    expect(() => detectShape(withoutTimestamp)).toThrow(/_orderId/);
  });

  it("rejects a file whose delimiter never split the header", () => {
    // One field means detectDelimiter found nothing to split on. The message
    // has to make that visible rather than reporting six missing columns.
    expect(() => detectShape([TRADOVATE_HEADER.join(";")])).toThrow(
      /not recognised/,
    );
  });

  it("says the other two shapes are not supported yet", () => {
    expect(() =>
      detectShape(["Symbol", "Side", "Qty", "Entry Price", "Exit Price"]),
    ).toThrow(/Round-trip and TradingView exports are not supported yet/);
  });

  it("has nothing to say about an empty header", () => {
    expect(() => detectShape([])).toThrow(/no columns at all/);
  });

  it("names both expected header sets when nothing matches", () => {
    expect(() => detectShape(["Symbol", "Side"])).toThrow(
      /Tradovate fills export needs the columns _id, _timestamp/,
    );
    expect(() => detectShape(["Symbol", "Side"])).toThrow(
      /FTMO export needs Ticket, Öffnen, Typ, Lots, Symbol, Preis, SL, Schließung, Preis/,
    );
  });
});

// The header row of a real FTMO (MetaTrader) account history, verbatim.
const FTMO_HEADER = [
  "Ticket",
  "Öffnen",
  "Typ",
  "Lots",
  "Symbol",
  "Preis",
  "SL",
  "TP",
  "Schließung",
  "Preis",
  "Swap",
  "Kommission",
  "Gewinn",
  "Pips",
  "Dauer des Trades in Sekunden",
];

describe("detectShape — FTMO", () => {
  it("recognises an FTMO export", () => {
    expect(detectShape(FTMO_HEADER)).toEqual({
      shape: "ftmo",
      columns: {
        ticket: 0,
        openTime: 1,
        type: 2,
        lots: 3,
        symbol: 4,
        entryPrice: 5,
        stopLoss: 6,
        closeTime: 8,
        exitPrice: 9,
        swap: 10,
        commission: 11,
        profit: 12,
      },
    });
  });

  it("resolves the two Preis columns by position", () => {
    const detected = detectShape(FTMO_HEADER);
    if (detected.shape !== "ftmo") throw new Error("not ftmo");
    const { columns } = detected;
    expect(columns.entryPrice).toBeLessThan(columns.closeTime);
    expect(columns.exitPrice).toBeGreaterThan(columns.closeTime);
  });

  it("rejects the header when a Preis column is missing", () => {
    const onePrice = FTMO_HEADER.filter((_, index) => index !== 9);
    expect(() => detectShape(onePrice)).toThrow(/not recognised/);
  });

  it("rejects the prices when they are not beside their times", () => {
    // Both prices after the close time: which is the open one is a guess.
    const moved = [...FTMO_HEADER];
    moved.splice(5, 1);
    moved.splice(9, 0, "Preis");
    expect(() => detectShape(moved)).toThrow(/Preis columns are not in place/);
  });

  it("does not recognise a header whose umlaut was mis-decoded", () => {
    // What a Windows-1252 file read as UTF-8 looks like: the reason
    // file-step.tsx decodes with a fallback.
    const garbled = FTMO_HEADER.map((name) =>
      name.replace("Ö", "\uFFFD").replace("ß", "\uFFFD"),
    );
    expect(() => detectShape(garbled)).toThrow(/missing: Öffnen, Schließung/);
  });

  it("keeps the Tradovate export on the fills shape", () => {
    expect(detectShape(TRADOVATE_HEADER).shape).toBe("fills");
  });
});

// The header row of a real Tradovate Orders export, verbatim.
const ORDERS_HEADER =
  "orderId,Account,Order ID,B/S,Contract,Product,Product Description,avgPrice,filledQty,Fill Time,lastCommandId,Status,_priceFormat,_priceFormatType,_tickSize,spreadDefinitionId,Version ID,Timestamp,Date,Quantity,Text,Type,Limit Price,Stop Price,decimalLimit,decimalStop,Filled Qty,Avg Fill Price,decimalFillAvg,Venue,Notional Value,Currency".split(
    ",",
  );

describe("detectOrders", () => {
  it("recognises a Tradovate Orders export", () => {
    expect(detectOrders(ORDERS_HEADER)).toEqual({
      orderId: 0,
      side: 3,
      contract: 4,
      type: 21,
      stopPrice: 23,
      fillTime: 9,
      lastChange: 17,
    });
  });

  it("is not a shape an import can be on its own", () => {
    // An Orders export has no UTC column and no fill ids; it only ever adds
    // stops to a fills export.
    expect(() => detectShape(ORDERS_HEADER)).toThrow(/not recognised/);
  });

  it("does not take a fills export for one", () => {
    expect(detectOrders(TRADOVATE_HEADER)).toBeNull();
  });

  it("rejects an Orders export without its stop column", () => {
    expect(
      detectOrders(ORDERS_HEADER.filter((name) => name !== "Stop Price")),
    ).toBeNull();
  });
});

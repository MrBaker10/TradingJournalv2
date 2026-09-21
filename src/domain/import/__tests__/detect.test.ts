import { describe, expect, it } from "vitest";
import { detectShape } from "../detect.ts";

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
      },
    });
  });

  it("points at the machine columns, not the display ones", () => {
    // `Fill ID` (10) and `Timestamp` (12) hold the same values formatted for
    // a human, and `Timestamp` is rendered in whatever zone the platform is
    // set to. Reading those would make the import depend on a setting the
    // file never states.
    const { columns } = detectShape(TRADOVATE_HEADER);
    expect(columns.fillId).toBe(0);
    expect(columns.timestamp).toBe(3);
  });

  it("ignores case and padding in the header", () => {
    const { columns } = detectShape(
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
});

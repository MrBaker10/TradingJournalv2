import { describe, expect, it } from "vitest";
import { tileLabel } from "../tile-label.ts";

describe("tileLabel", () => {
  it.each([
    "ES",
    "NQ",
    "YM",
    "RTY",
    "GC",
    "CL",
    "MES",
    "MNQ",
    "MYM",
    "M2K",
    "MGC",
  ])("leaves the futures root %s exactly as it is", (symbol) => {
    expect(tileLabel(symbol)).toEqual({
      text: symbol,
      compact: false,
      tight: false,
    });
  });

  it.each([
    ["US100.cash", { text: "US100", compact: true, tight: false }],
    ["US30.cash", { text: "US30", compact: false, tight: false }],
    ["XAUUSD", { text: "XAUUSD", compact: true, tight: false }],
    ["EURUSD", { text: "EURUSD", compact: true, tight: false }],
    ["GER40.cash", { text: "GER40", compact: true, tight: false }],
    ["JP225.cash", { text: "JP225", compact: true, tight: false }],
    ["N25.cash", { text: "N25", compact: false, tight: false }],
    ["COCOA.c", { text: "COCOA", compact: true, tight: false }],
    ["SOYBEAN.c", { text: "SOYBEAN", compact: true, tight: true }],
    ["BTCUSD", { text: "BTCUSD", compact: true, tight: false }],
    ["DOGEUSD", { text: "DOGEUSD", compact: true, tight: true }],
  ])("shortens the CFD symbol %s", (symbol, expected) => {
    expect(tileLabel(symbol)).toEqual(expected);
  });

  it("keeps a symbol whose only dot is at the start", () => {
    expect(tileLabel(".cash")).toEqual({
      text: ".cash",
      compact: true,
      tight: false,
    });
  });

  it("drops a trailing dot", () => {
    expect(tileLabel("MNQ.")).toEqual({
      text: "MNQ",
      compact: false,
      tight: false,
    });
  });

  it.each([
    ["EURUSD", false],
    ["DOGEUSD", true],
    ["SOYBEAN.c", true],
    ["HEATOIL.c", true],
  ])(
    "tightens the tracking of %s only from seven characters",
    (symbol, tight) => {
      expect(tileLabel(symbol).tight).toBe(tight);
    },
  );
});

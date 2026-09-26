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
    expect(tileLabel(symbol)).toEqual({ text: symbol, compact: false });
  });

  it.each([
    ["US100.cash", { text: "US100", compact: true }],
    ["US30.cash", { text: "US30", compact: false }],
    ["XAUUSD", { text: "XAUUSD", compact: true }],
    ["EURUSD", { text: "EURUSD", compact: true }],
    ["GER40.cash", { text: "GER40", compact: true }],
    ["JP225.cash", { text: "JP225", compact: true }],
    ["N25.cash", { text: "N25", compact: false }],
    ["COCOA.c", { text: "COCOA", compact: true }],
    ["SOYBEAN.c", { text: "SOYBEAN", compact: true }],
    ["BTCUSD", { text: "BTCUSD", compact: true }],
    ["DOGEUSD", { text: "DOGEUSD", compact: true }],
  ])("shortens the CFD symbol %s", (symbol, expected) => {
    expect(tileLabel(symbol)).toEqual(expected);
  });

  it("keeps a symbol whose only dot is at the start", () => {
    expect(tileLabel(".cash")).toEqual({ text: ".cash", compact: true });
  });

  it("drops a trailing dot", () => {
    expect(tileLabel("MNQ.")).toEqual({ text: "MNQ", compact: false });
  });
});

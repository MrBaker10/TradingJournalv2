import { describe, expect, it } from "vitest";
import {
  ASSET_CLASSES,
  groupByAssetClass,
  isAssetClass,
} from "../instruments.ts";

const row = (symbol: string, assetClass: string) => ({ symbol, assetClass });

describe("groupByAssetClass", () => {
  it("orders groups futures, indices, forex, metals, commodities, crypto", () => {
    const groups = groupByAssetClass([
      row("BTCUSD", "crypto"),
      row("USOIL.cash", "commodity"),
      row("XAUUSD", "metal"),
      row("EURUSD", "forex"),
      row("GER40.cash", "index"),
      row("ES", "future"),
    ]);
    expect(groups.map((group) => group.label)).toEqual([
      "Futures",
      "Indices",
      "Forex",
      "Metals",
      "Commodities",
      "Crypto",
    ]);
  });

  it("keeps the given order inside a group", () => {
    const [forex] = groupByAssetClass([
      row("EURUSD", "forex"),
      row("AUDCAD", "forex"),
      row("GBPJPY", "forex"),
    ]);
    expect(forex.instruments.map((instrument) => instrument.symbol)).toEqual([
      "EURUSD",
      "AUDCAD",
      "GBPJPY",
    ]);
  });

  it("leaves out empty groups", () => {
    const groups = groupByAssetClass([row("NQ", "future")]);
    expect(groups).toHaveLength(1);
    expect(groups[0].assetClass).toBe("future");
  });

  it("returns nothing for no instruments", () => {
    expect(groupByAssetClass([])).toEqual([]);
  });

  it("throws on an unknown class instead of hiding the instrument", () => {
    expect(() => groupByAssetClass([row("AAPL", "equity")])).toThrow(/equity/);
  });
});

describe("isAssetClass", () => {
  it("accepts every listed class and nothing else", () => {
    for (const assetClass of ASSET_CLASSES) {
      expect(isAssetClass(assetClass)).toBe(true);
    }
    expect(isAssetClass("cfd")).toBe(false);
    expect(isAssetClass("")).toBe(false);
  });
});

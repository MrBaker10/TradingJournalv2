import { describe, expect, it } from "vitest";
import type { ExportTradeRow } from "../../../db/queries/export.ts";
import {
  EXPORT_COLUMNS,
  tradesToCsvRows,
  tradeToCsvRow,
} from "../trade-export.ts";

function column(row: string[], name: (typeof EXPORT_COLUMNS)[number]): string {
  return row[EXPORT_COLUMNS.indexOf(name)];
}

// A taken ES trade: 10 points on one contract at $50 a point = $500, risking
// 5 points = $250, so R is exactly 2.00.
const takenTrade: ExportTradeRow = {
  id: 1,
  tradeDate: "2026-09-10",
  taken: true,
  instrumentSymbol: "ES",
  pointValue: "50.0000",
  profitRateVsUsd: null,
  profitCurrency: "USD",
  direction: "long",
  contracts: "1.0000",
  entryTime: "09:45:00",
  exitTime: "10:20:00",
  entryPrice: "5000.0000",
  exitPrice: "5010.0000",
  stopPrice: "4995.0000",
  points: "10.0000",
  session: "NY-AM",
  setupType: "Break & Retest",
  entryModel: "FVG",
  result: "Win",
  grade: "A",
  felt: "Disciplined",
  byTheBook: true,
  mfeR: "2.40",
  maeR: "0.30",
  postExitMfeR: "3.10",
  pnlOverride: null,
  confluences: ["HTF bias", "Liquidity sweep"],
  mistakes: [],
  notes: "Clean entry",
  links: [
    { url: "https://example.com/chart", label: "Chart" },
    { url: "https://example.com/replay", label: null },
  ],
  screenshotCount: 2,
  accounts: [
    { name: "Eval 1", isPractice: false },
    { name: "Practice A", isPractice: true },
  ],
  createdAt: new Date("2026-09-10T18:30:00.000Z"),
};

const missedSetup: ExportTradeRow = {
  ...takenTrade,
  id: 2,
  taken: false,
  contracts: null,
  exitTime: null,
  exitPrice: null,
  points: null,
  result: null,
  byTheBook: null,
  postExitMfeR: null,
  confluences: [],
  links: [],
  screenshotCount: 0,
  accounts: [],
  notes: null,
};

describe("tradeToCsvRow", () => {
  it("writes exactly one value per column", () => {
    expect(tradeToCsvRow(takenTrade)).toHaveLength(EXPORT_COLUMNS.length);
    expect(tradeToCsvRow(missedSetup)).toHaveLength(EXPORT_COLUMNS.length);
  });

  it("keeps accounts and is_practice positionally aligned", () => {
    const row = tradeToCsvRow(takenTrade);
    expect(column(row, "accounts")).toBe("Eval 1;Practice A");
    expect(column(row, "is_practice")).toBe("false;true");
  });

  it("keeps links and link_labels positionally aligned, empty label included", () => {
    const row = tradeToCsvRow(takenTrade);
    expect(column(row, "links")).toBe(
      "https://example.com/chart;https://example.com/replay",
    );
    expect(column(row, "link_labels")).toBe("Chart;");
  });

  it("derives P&L without a currency symbol or a thousands separator", () => {
    expect(column(tradeToCsvRow(takenTrade), "pnl")).toBe("500.00");
  });

  it("derives the R multiple with two decimals", () => {
    expect(column(tradeToCsvRow(takenTrade), "r_multiple")).toBe("2.00");
  });

  it("prefers the user's P&L override over the derived figure", () => {
    const row = tradeToCsvRow({ ...takenTrade, pnlOverride: "412.50" });
    expect(column(row, "pnl")).toBe("412.50");
  });

  it("leaves P&L and R empty for a missed setup", () => {
    const row = tradeToCsvRow(missedSetup);
    expect(column(row, "pnl")).toBe("");
    expect(column(row, "r_multiple")).toBe("");
  });

  it("leaves R empty without a stop price", () => {
    const row = tradeToCsvRow({ ...takenTrade, stopPrice: null });
    expect(column(row, "r_multiple")).toBe("");
    expect(column(row, "pnl")).toBe("500.00");
  });

  it("writes a quantity without padding zeros", () => {
    expect(column(tradeToCsvRow(takenTrade), "contracts")).toBe("1");
    const lots = tradeToCsvRow({ ...takenTrade, contracts: "1.8800" });
    expect(column(lots, "contracts")).toBe("1.88");
    const tens = tradeToCsvRow({ ...takenTrade, contracts: "10.0000" });
    expect(column(tens, "contracts")).toBe("10");
  });

  it("prices a fractional quantity", () => {
    // 10 points * $50 * 0.5 = $250
    const row = tradeToCsvRow({ ...takenTrade, contracts: "0.5000" });
    expect(column(row, "pnl")).toBe("250.00");
  });

  it("converts P&L from an instrument's profit currency", () => {
    // USDJPY 0.5 * 100,000 = ¥50,000 at 0.0062950656 = $314.75
    const row = tradeToCsvRow({
      ...takenTrade,
      pointValue: "100000.0000",
      entryPrice: "157.10000",
      exitPrice: "157.60000",
      stopPrice: "156.85000",
      profitCurrency: "JPY",
      profitRateVsUsd: "0.0062950656",
    });
    expect(column(row, "pnl")).toBe("314.75");
    expect(column(row, "r_multiple")).toBe("2.00");
  });

  it("leaves P&L empty while no rate for the profit currency exists", () => {
    const row = tradeToCsvRow({
      ...takenTrade,
      profitCurrency: "JPY",
      profitRateVsUsd: null,
    });
    expect(column(row, "pnl")).toBe("");
    expect(column(row, "r_multiple")).toBe("2.00");
  });

  it("writes an empty field for every null, never the word null", () => {
    const row = tradeToCsvRow(missedSetup);
    expect(column(row, "exit_time")).toBe("");
    expect(column(row, "contracts")).toBe("");
    expect(column(row, "by_the_book")).toBe("");
    expect(column(row, "notes")).toBe("");
    expect(column(row, "accounts")).toBe("");
    expect(column(row, "is_practice")).toBe("");
  });

  it("writes booleans as true and false", () => {
    expect(column(tradeToCsvRow(takenTrade), "taken")).toBe("true");
    expect(column(tradeToCsvRow(takenTrade), "by_the_book")).toBe("true");
    expect(column(tradeToCsvRow(missedSetup), "taken")).toBe("false");
  });

  it("writes created_at as ISO-8601 in UTC", () => {
    expect(column(tradeToCsvRow(takenTrade), "created_at")).toBe(
      "2026-09-10T18:30:00.000Z",
    );
  });

  it("keeps the chart-clock times unconverted", () => {
    const row = tradeToCsvRow(takenTrade);
    expect(column(row, "entry_time")).toBe("09:45:00");
    expect(column(row, "exit_time")).toBe("10:20:00");
  });

  it("keeps prices at their stored precision", () => {
    expect(column(tradeToCsvRow(takenTrade), "entry_price")).toBe("5000.0000");
  });
});

describe("tradesToCsvRows", () => {
  it("puts the header first and one row per trade after it", () => {
    const rows = tradesToCsvRows([takenTrade, missedSetup]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual([...EXPORT_COLUMNS]);
  });

  it("writes one row for a trade assigned to several accounts", () => {
    const rows = tradesToCsvRows([takenTrade]);
    expect(rows).toHaveLength(2);
  });

  it("returns just the header for an empty journal", () => {
    expect(tradesToCsvRows([])).toEqual([[...EXPORT_COLUMNS]]);
  });
});

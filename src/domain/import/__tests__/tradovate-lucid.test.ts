import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseDelimited } from "../../../lib/csv/parse.ts";
import { commissionInFilePnl, importCommission } from "../../commission.ts";
import { calculateUsdPnl } from "../../pnl.ts";
import { detectShape } from "../detect.ts";
import { pairFills } from "../fills.ts";
import {
  type InstrumentRef,
  normalizeFills,
  normalizeTrades,
} from "../normalize.ts";
import type { NormalizedTrade } from "../types.ts";

// A real Tradovate fills export of a Lucid evaluation (Daily EOD 25K,
// 2026-10-05 to 2026-10-21), anonymized: account and ids replaced, prices,
// times, quantities and commissions as exported. The expected figures are
// read off the Lucid dashboard's trading history for that account, not
// computed, so the test can disagree with the import.
const FIXTURE = join(
  process.cwd(),
  "src/domain/import/__tests__/fixtures/tradovate-fills-lucid-2026-10.csv",
);

// instruments seed (src/db/seed-instruments.ts): tick size and point value.
const INSTRUMENTS = [
  { id: 1, symbol: "MES", tickSize: 0.25, pointValue: 5 },
  { id: 2, symbol: "MNQ", tickSize: 0.25, pointValue: 2 },
  { id: 3, symbol: "MYM", tickSize: 1, pointValue: 0.5 },
];

interface DayFigures {
  netCents: number;
  commissionCents: number;
  contracts: number;
}

/** The import's path from file to round trips, as the wizard runs it. */
function importedTrades(): NormalizedTrade[] {
  const [header, ...data] = parseDelimited(readFileSync(FIXTURE, "utf8"));
  const detected = detectShape(header);
  if (detected.shape !== "fills") throw new Error("expected a fills export");

  const read = normalizeFills(data, detected.columns, "Europe/Berlin");
  const refs: InstrumentRef[] = INSTRUMENTS.map(({ id, symbol, tickSize }) => ({
    id,
    symbol,
    tickSize,
  }));
  const { rows, invalid } = normalizeTrades(pairFills(read.fills), refs);
  if (read.invalid.length > 0 || invalid.length > 0) {
    throw new Error("the fixture has rows the import could not read");
  }
  return rows;
}

/** One round trip's figures, as the preview computes them. */
function tradeFigures(row: NormalizedTrade): DayFigures & { symbol: string } {
  const instrument = INSTRUMENTS.find((item) => item.id === row.instrumentId);
  if (instrument === undefined || row.exitPrice === null) {
    throw new Error(
      `unexpected open or unknown trade at line ${row.sourceRow}`,
    );
  }
  const gross = calculateUsdPnl({
    direction: row.direction,
    entryPrice: row.entryPrice,
    exitPrice: row.exitPrice,
    contracts: row.contracts,
    pointValue: instrument.pointValue,
    profitCurrency: "USD",
    profitRateVsUsd: null,
  }).pnlCents;
  const commission = importCommission({
    fileCents: row.fileCommissionCents,
    commissionInFilePnl: commissionInFilePnl("fills", row.filePnlCents),
    perSideCents: null,
    contracts: row.contracts,
  });
  if (gross === null || commission === null) {
    throw new Error(`no P&L or commission at line ${row.sourceRow}`);
  }
  return {
    symbol: instrument.symbol,
    netCents: gross - commission.cents,
    commissionCents: commission.cents,
    contracts: row.contracts,
  };
}

function byDayAndSymbol(rows: NormalizedTrade[]): Record<string, DayFigures> {
  const byKey: Record<string, DayFigures> = {};
  for (const row of rows) {
    const { symbol, ...trade } = tradeFigures(row);
    const key = `${row.tradeDate} ${symbol}`;
    const day = byKey[key] ?? { netCents: 0, commissionCents: 0, contracts: 0 };
    day.netCents += trade.netCents;
    day.commissionCents += trade.commissionCents;
    day.contracts += trade.contracts;
    byKey[key] = day;
  }
  return byKey;
}

describe("a Tradovate fills export against the Lucid dashboard", () => {
  it("matches Lucid's net P&L, commission and quantity per day and symbol", () => {
    expect(byDayAndSymbol(importedTrades())).toEqual({
      "2026-10-05 MYM": {
        netCents: -64000,
        commissionCents: 2000,
        contracts: 20,
      },
      "2026-10-06 MNQ": {
        netCents: -18000,
        commissionCents: 500,
        contracts: 5,
      },
      "2026-10-06 MES": { netCents: 43250, commissionCents: 500, contracts: 5 },
      "2026-10-07 MNQ": { netCents: 50, commissionCents: 100, contracts: 1 },
      "2026-10-08 MNQ": {
        netCents: -16800,
        commissionCents: 600,
        contracts: 6,
      },
      "2026-10-09 MES": { netCents: 16200, commissionCents: 800, contracts: 8 },
      "2026-10-15 MNQ": { netCents: -8500, commissionCents: 200, contracts: 2 },
      "2026-10-15 MES": { netCents: 26625, commissionCents: 500, contracts: 5 },
      "2026-10-21 MNQ": {
        netCents: -61950,
        commissionCents: 1600,
        contracts: 16,
      },
    });
  });
});

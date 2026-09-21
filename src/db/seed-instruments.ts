import { db } from "./index.ts";
import { instruments } from "./schema/instruments.ts";

const FUTURES = [
  { symbol: "ES", name: "E-mini S&P 500", pointValue: "50", tickSize: "0.25" },
  {
    symbol: "NQ",
    name: "E-mini Nasdaq-100",
    pointValue: "20",
    tickSize: "0.25",
  },
  { symbol: "YM", name: "E-mini Dow", pointValue: "5", tickSize: "1" },
  {
    symbol: "RTY",
    name: "E-mini Russell 2000",
    pointValue: "50",
    tickSize: "0.10",
  },
  { symbol: "GC", name: "Gold", pointValue: "100", tickSize: "0.10" },
  { symbol: "CL", name: "Crude Oil", pointValue: "1000", tickSize: "0.01" },
  {
    symbol: "MES",
    name: "Micro E-mini S&P 500",
    pointValue: "5",
    tickSize: "0.25",
  },
  {
    symbol: "MNQ",
    name: "Micro E-mini Nasdaq-100",
    pointValue: "2",
    tickSize: "0.25",
  },
  {
    symbol: "MYM",
    name: "Micro E-mini Dow",
    pointValue: "0.50",
    tickSize: "1",
  },
  {
    symbol: "M2K",
    name: "Micro E-mini Russell 2000",
    pointValue: "5",
    tickSize: "0.10",
  },
  { symbol: "MGC", name: "Micro Gold", pointValue: "10", tickSize: "0.10" },
];

async function seed() {
  for (const instrument of FUTURES) {
    await db
      .insert(instruments)
      .values(instrument)
      .onConflictDoUpdate({
        target: instruments.symbol,
        set: {
          name: instrument.name,
          pointValue: instrument.pointValue,
          tickSize: instrument.tickSize,
        },
      });
  }

  console.log(`Seeded ${FUTURES.length} instruments.`);
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});

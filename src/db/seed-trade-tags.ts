import { db } from "./index.ts";
import { confluenceTags, mistakeTags } from "./schema/trades.ts";

const CONFLUENCE_GROUPS: Record<string, string[]> = {
  Session: [
    "Opening Range",
    "ORB High",
    "ORB Low",
    "China Open",
    "TDO",
    "COMEX Open",
    "NYO",
    "Session Open",
    "Prev Day High",
    "Prev Day Low",
    "PD 50%",
    "Prev Week High",
    "Prev Week Low",
    "PW 50%",
    "Overnight High",
    "Overnight Low",
    "Asia High",
    "Asia Low",
    "London High",
    "London Low",
  ],
  "Volume Profile": [
    "Point of Control",
    "Value Area High",
    "Value Area Low",
    "Developing VAH",
    "Developing POC",
    "Developing VAL",
    "Current Week VAH",
    "Current Week POC",
    "Current Week VAL",
    "Prev Day VAH",
    "Prev Day POC",
    "Prev Day VAL",
    "Prev Week VAH",
    "Prev Week POC",
    "Prev Week VAL",
    "Overnight VAH",
    "Overnight POC",
    "Overnight VAL",
    "Volume Shelf",
  ],
  ICT: ["Fair Value Gap", "HTF FVG", "Order Block", "Liquidity Sweep", "CISD"],
  Derived: [
    "VWAP",
    "NY VWAP",
    "VWAP Band 1",
    "VWAP Band 2",
    "5m 9EMA",
    "5m 20EMA",
    "Trendline",
    "Round Number",
  ],
  Continuation: ["5m FVG", "15m FVG", "30m FVG", "1H FVG", "4H FVG"],
  Other: ["Other"],
};

const MISTAKES = [
  "chased entry",
  "moved stop",
  "cut winner early",
  "oversized",
  "no confluence",
  "traded news",
  "revenge trade",
  "broke daily limit",
  "traded outside session",
  "ignored higher timeframe",
];

async function seed() {
  let confluenceCount = 0;
  for (const [group, labels] of Object.entries(CONFLUENCE_GROUPS)) {
    for (const label of labels) {
      await db
        .insert(confluenceTags)
        .values({ group, label })
        .onConflictDoNothing({
          target: [confluenceTags.group, confluenceTags.label],
        });
      confluenceCount += 1;
    }
  }

  for (const label of MISTAKES) {
    await db
      .insert(mistakeTags)
      .values({ label })
      .onConflictDoNothing({ target: mistakeTags.label });
  }

  console.log(
    `Seeded ${confluenceCount} confluence tags and ${MISTAKES.length} mistake tags.`,
  );
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});

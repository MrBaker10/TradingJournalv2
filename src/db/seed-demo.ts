import { hashPassword } from "better-auth/crypto";
import { and, eq, inArray } from "drizzle-orm";
import { calculateConsistencyScore } from "../domain/consistency.ts";
import { reviewWeekStartOf } from "../domain/review-week.ts";
import { placeholderEmail } from "../lib/auth/placeholder-email.ts";
import { syncUserBadges } from "../lib/badges/sync.ts";
import { calendarDateOf, monthKeyOf, shiftMonth } from "../lib/time.ts";
import { saveTrade } from "../lib/trades/save.ts";
import { createTradeSchema } from "../schemas/trades.ts";
import { db } from "./index.ts";
import { getMonthScoreDays } from "./queries/dashboard.ts";
import { upsertMonthlyScore } from "./queries/monthly-scores.ts";
import { accountRules } from "./schema/account-rules.ts";
import { accountCommissionRates, accounts } from "./schema/accounts.ts";
import { authAccounts } from "./schema/auth.ts";
import {
  checklistTemplateItems,
  dailyChecklistChecks,
} from "./schema/checklist.ts";
import { dailyNotes } from "./schema/daily-notes.ts";
import { instruments } from "./schema/instruments.ts";
import { ledgerEntries } from "./schema/ledger.ts";
import { propFirmPrograms, propFirms } from "./schema/prop-firms.ts";
import { strategyRevisions, tradingStrategies } from "./schema/strategies.ts";
import { confluenceTags, mistakeTags } from "./schema/trades.ts";
import { users } from "./schema/users.ts";
import { weeklyReviews } from "./schema/weekly-reviews.ts";

// `pnpm db:seed:demo`: a local demo user with about four months of made-up
// journal data, so every page has something to show. Re-running deletes the
// demo user (everything cascades) and writes it anew; no other user is
// touched. Local databases only — the script refuses any other host.
//
// Needs the reference seeds first (instruments, trade tags, prop firms,
// badges). Every instrument used settles in USD and every account is a USD
// account, so saving a trade never has to fetch an ECB rate.
//
// The data is deterministic for a given day: a fixed PRNG seed, dates
// relative to today.

const DEMO_USERNAME = "demo";
const DEMO_TIMEZONE = "Europe/Berlin";
const MIN_PASSWORD_LENGTH = 8;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const HISTORY_DAYS = 120;

type IsoDate = string;

function assertLocalDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const host = new URL(url).hostname.replace(/^\[|\]$/g, "");
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `db:seed:demo only runs against a local database, not '${host}'.`,
    );
  }
}

// mulberry32: small, seedable, good enough for demo data.
function createRandom(seed: number) {
  let state = seed;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    chance: (probability: number) => next() < probability,
    int: (min: number, max: number) =>
      min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]) => items[Math.floor(next() * items.length)],
  };
}

function shiftDate(date: IsoDate, days: number): IsoDate {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

function isWeekday(date: IsoDate): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day !== 0 && day !== 6;
}

function timeOf(minutes: number): string {
  const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
  return `${hours}:${String(minutes % 60).padStart(2, "0")}`;
}

function roundToTick(price: number, tick: number): number {
  return Number((Math.round(price / tick) * tick).toFixed(2));
}

async function resetDemoUser() {
  // Cascades to every user-owned table; trade_accounts' key is deferred
  // (migration 0013), so the cascade through trades passes.
  await db.delete(users).where(eq(users.username, DEMO_USERNAME));
}

async function createDemoUser(password: string, today: IsoDate) {
  // Registered before the history starts, so the month-close job and the
  // consistency score treat every seeded month as a full one.
  const registeredAt = new Date(
    `${shiftDate(today, -HISTORY_DAYS - 5)}T08:00:00Z`,
  );
  const [user] = await db
    .insert(users)
    .values({
      username: DEMO_USERNAME,
      displayUsername: DEMO_USERNAME,
      email: placeholderEmail(DEMO_USERNAME),
      displayName: "Demo Trader",
      timezone: DEMO_TIMEZONE,
      createdAt: registeredAt,
    })
    .returning({ id: users.id });

  await db.insert(authAccounts).values({
    userId: user.id,
    accountId: String(user.id),
    providerId: "credential",
    password: await hashPassword(password),
  });
  return user.id;
}

async function findProgramId(firmName: string, programName: string) {
  const [program] = await db
    .select({ id: propFirmPrograms.id })
    .from(propFirmPrograms)
    .innerJoin(propFirms, eq(propFirms.id, propFirmPrograms.firmId))
    .where(
      and(eq(propFirms.name, firmName), eq(propFirmPrograms.name, programName)),
    )
    .limit(1);
  return program?.id ?? null;
}

async function createAccounts(userId: number, today: IsoDate) {
  const rows = await db
    .insert(accounts)
    .values([
      {
        userId,
        name: "Apex 50k #1",
        sortOrder: 0,
        isDefaultForNewTrades: true,
        startingBalance: "50000",
        startingBalanceUsd: "50000",
      },
      {
        userId,
        name: "Apex 50k #2",
        sortOrder: 1,
        startingBalance: "50000",
        startingBalanceUsd: "50000",
      },
      {
        userId,
        name: "Legends Eval",
        sortOrder: 2,
        startingBalance: "50000",
        startingBalanceUsd: "50000",
      },
      { userId, name: "Practice", sortOrder: 3, isPractice: true },
      {
        userId,
        name: "Old Eval",
        sortOrder: 4,
        startingBalance: "50000",
        startingBalanceUsd: "50000",
      },
    ])
    .returning({ id: accounts.id });
  const [apexOne, apexTwo, legends, practice, oldEval] = rows.map(
    (row) => row.id,
  );

  const apexProgram = await findProgramId("Apex Trader Funding", "50k EOD");
  const legendsProgram = await findProgramId("Legends Trading", "50k Elite");
  const rules: (typeof accountRules.$inferInsert)[] = [];
  if (apexProgram !== null) {
    for (const accountId of [apexOne, apexTwo]) {
      rules.push({
        accountId,
        programId: apexProgram,
        evaluationStart: shiftDate(today, -HISTORY_DAYS + 30),
        profitTarget: "3000",
        drawdownAmount: "2000",
        drawdownType: "eod_trailing",
        lockLevel: "50100",
        dailyLossLimit: "1000",
      });
    }
  }
  if (legendsProgram !== null) {
    rules.push({
      accountId: legends,
      programId: legendsProgram,
      evaluationStart: shiftDate(today, -35),
      profitTarget: "2700",
      drawdownAmount: "2200",
      drawdownType: "intraday_trailing",
      consistencyPercent: 40,
    });
  }
  if (rules.length > 0) await db.insert(accountRules).values(rules);

  return { apexOne, apexTwo, legends, practice, oldEval };
}

async function loadInstruments() {
  const rows = await db
    .select({
      id: instruments.id,
      symbol: instruments.symbol,
      tickSize: instruments.tickSize,
    })
    .from(instruments)
    .where(inArray(instruments.symbol, ["NQ", "MNQ", "ES", "MES"]));
  const bySymbol = new Map(rows.map((row) => [row.symbol, row]));
  for (const symbol of ["NQ", "MNQ", "ES", "MES"]) {
    if (!bySymbol.has(symbol)) {
      throw new Error(
        `Instrument ${symbol} missing — run pnpm db:seed:instruments first.`,
      );
    }
  }
  return bySymbol;
}

async function addCommissionRates(
  accountIds: number[],
  instrumentIds: Map<string, number>,
) {
  const perSide: Record<string, string> = {
    NQ: "2.25",
    ES: "2.25",
    MNQ: "0.62",
    MES: "0.62",
  };
  await db.insert(accountCommissionRates).values(
    accountIds.flatMap((accountId) =>
      Object.entries(perSide).map(([symbol, rate]) => ({
        accountId,
        instrumentId: instrumentIds.get(symbol) as number,
        perSide: rate,
      })),
    ),
  );
}

async function createStrategies(userId: number) {
  const [orb, sweep, legacy] = await db
    .insert(tradingStrategies)
    .values([{ userId }, { userId }, { userId, archivedAt: new Date() }])
    .returning({ id: tradingStrategies.id });

  await db.insert(strategyRevisions).values([
    {
      strategyId: orb.id,
      name: "Opening Range Break",
      prerequisites: "No high-impact news in the first 30 minutes.",
      entry: "Break and retest of the 15-minute opening range.",
      stopRisk: "Stop behind the retest candle, 1R max $250.",
      exit: "2R target, trail after 1R.",
    },
    // A second revision, so the strategy shows a history.
    {
      strategyId: orb.id,
      name: "Opening Range Break",
      prerequisites:
        "No high-impact news in the first 30 minutes. Bias agrees with the 1H trend.",
      entry: "Break and retest of the 15-minute opening range.",
      stopRisk: "Stop behind the retest candle, 1R max $250.",
      exit: "2R target, trail after 1R.",
      exclusions: "No entries after 11:00.",
    },
    {
      strategyId: sweep.id,
      name: "Liquidity Sweep Reversal",
      prerequisites: "Sweep of a session high or low.",
      entry: "CISD on the 5-minute after the sweep.",
      stopRisk: "Stop beyond the sweep wick.",
      exit: "Opposing liquidity or 3R.",
    },
    {
      strategyId: legacy.id,
      name: "Trend Pullback (retired)",
      entry: "Pullback to the 9 EMA in a trending session.",
    },
  ]);
  return { orb: orb.id, sweep: sweep.id };
}

async function createChecklist(userId: number) {
  const items: { phase: "premarket" | "trading" | "review"; text: string }[] = [
    { phase: "premarket", text: "Check the economic calendar" },
    { phase: "premarket", text: "Mark previous day high and low" },
    { phase: "premarket", text: "Write the pre-market plan" },
    { phase: "trading", text: "Only A setups" },
    { phase: "trading", text: "Stop after two losses" },
    { phase: "review", text: "Log every trade" },
    { phase: "review", text: "Write the end-of-day review" },
  ];
  return db
    .insert(checklistTemplateItems)
    .values(items.map((item, index) => ({ userId, ...item, position: index })))
    .returning({
      id: checklistTemplateItems.id,
      phase: checklistTemplateItems.phase,
      text: checklistTemplateItems.text,
    });
}

/**
 * The days the demo user traded: weekdays over the history, with a week off
 * about six weeks back (so the longest streak beats the current one) and a few
 * single skipped days.
 */
function tradingDays(today: IsoDate, random: ReturnType<typeof createRandom>) {
  const days: IsoDate[] = [];
  for (let offset = HISTORY_DAYS; offset >= 0; offset -= 1) {
    const date = shiftDate(today, -offset);
    if (!isWeekday(date)) continue;
    if (offset >= 40 && offset <= 46) continue;
    if (offset > 12 && random.chance(0.12)) continue;
    days.push(date);
  }
  return days;
}

const INSTRUMENT_MIX = [
  "NQ",
  "NQ",
  "NQ",
  "MNQ",
  "MNQ",
  "ES",
  "ES",
  "MES",
] as const;
const BASE_PRICE: Record<string, number> = {
  NQ: 21000,
  MNQ: 21000,
  ES: 6000,
  MES: 6000,
};
const STOP_POINTS: Record<string, [number, number]> = {
  NQ: [15, 40],
  MNQ: [15, 40],
  ES: [4, 10],
  MES: [4, 10],
};
const CONTRACTS: Record<string, [number, number]> = {
  NQ: [1, 1],
  MNQ: [2, 5],
  ES: [1, 2],
  MES: [2, 6],
};
const WIN_R = [1, 1.5, 2, 2, 2.5];

const WIN_NOTES = [
  "Waited for the retest, clean fill.",
  "Followed the plan, took partials at 1R.",
  "Textbook setup, patience paid off.",
];
const LOSS_NOTES = [
  "Entered before confirmation.",
  "Valid setup, market just did not follow through.",
  "Stopped out on the news spike.",
];

interface DemoAccounts {
  apexOne: number;
  apexTwo: number;
  legends: number;
  practice: number;
  oldEval: number;
}

async function createTrades(
  userId: number,
  days: IsoDate[],
  accountIds: DemoAccounts,
  instrumentRows: Map<string, { id: number; tickSize: string }>,
  strategyIds: { orb: number; sweep: number },
  tagIds: { confluence: Map<string, number>; mistake: Map<string, number> },
  random: ReturnType<typeof createRandom>,
  today: IsoDate,
) {
  const legendsStart = shiftDate(today, -35);
  const oldEvalEnd = shiftDate(today, -HISTORY_DAYS + 30);
  const confluence = [...tagIds.confluence.values()];
  let saved = 0;
  let drift = 0;

  for (const date of days) {
    drift += random.int(-60, 70);
    const tradesToday = random.int(1, 3);
    for (let index = 0; index < tradesToday; index += 1) {
      const symbol = random.pick(INSTRUMENT_MIX);
      const instrument = instrumentRows.get(symbol) as {
        id: number;
        tickSize: string;
      };
      const tick = Number(instrument.tickSize);
      const isNasdaq = symbol.endsWith("NQ");
      const base = BASE_PRICE[symbol] + (isNasdaq ? drift : drift / 3.5);
      const entryPrice = roundToTick(base + random.int(-80, 80), tick);
      const [stopMin, stopMax] = STOP_POINTS[symbol];
      const stopPoints = roundToTick(random.int(stopMin, stopMax), tick);
      const direction = random.chance(0.55) ? "long" : "short";
      const sign = direction === "long" ? 1 : -1;
      const stopPrice = roundToTick(entryPrice - sign * stopPoints, tick);

      const london = random.chance(0.15);
      const entryMinutes = london
        ? random.int(180, 300)
        : random.int(15 * 60 + 35, 17 * 60 + 30);
      const strategyId = random.chance(0.75)
        ? random.pick([strategyIds.orb, strategyIds.sweep])
        : undefined;
      const confluenceTagIds = [
        random.pick(confluence),
        random.pick(confluence),
      ].filter((id, position, all) => all.indexOf(id) === position);
      const shared = {
        tradeDate: date,
        instrumentId: instrument.id,
        direction,
        entryTime: timeOf(entryMinutes),
        entryPrice,
        stopPrice,
        session: london ? "London" : "NY-AM",
        setupType: random.pick([
          "Break & Retest",
          "Continuation",
          "Reversal",
          "Stack Levels",
        ]),
        entryModel: random.pick(["iFVG", "FVG", "CISD", "Engulfing"]),
        confluenceTagIds,
        strategyId,
      };

      // Missed setups: about one in seven entries.
      if (random.chance(0.14)) {
        const input = createTradeSchema.parse({
          ...shared,
          taken: false,
          notes: "Saw it, hesitated, never clicked.",
          felt: random.pick(["Anxious", "Bored", "Neutral"]),
        });
        await saveOrThrow(userId, input);
        saved += 1;
        continue;
      }

      const roll = random.next();
      const outcome =
        roll < 0.36
          ? "Win"
          : roll < 0.85
            ? "Loss"
            : roll < 0.95
              ? "Breakeven"
              : "Scratch";
      const rMultiple =
        outcome === "Win"
          ? random.pick(WIN_R)
          : outcome === "Loss"
            ? random.chance(0.2)
              ? -0.5
              : -1
            : outcome === "Scratch"
              ? random.pick([-0.2, 0.2])
              : 0;
      const exitPrice = roundToTick(
        entryPrice + sign * rMultiple * stopPoints,
        tick,
      );
      const [contractMin, contractMax] = CONTRACTS[symbol];

      let accountIdsForTrade: number[];
      if (date < oldEvalEnd) accountIdsForTrade = [accountIds.oldEval];
      else if (random.chance(0.12)) accountIdsForTrade = [accountIds.practice];
      else if (date >= legendsStart && random.chance(0.35))
        accountIdsForTrade = [accountIds.legends];
      else accountIdsForTrade = [accountIds.apexOne, accountIds.apexTwo];

      const mistakeTagIds =
        outcome === "Loss" && random.chance(0.5)
          ? [random.pick([...tagIds.mistake.values()])]
          : [];
      const input = createTradeSchema.parse({
        ...shared,
        taken: true,
        exitTime: timeOf(entryMinutes + random.int(4, 55)),
        exitPrice,
        contracts: random.int(contractMin, contractMax),
        result: outcome,
        accountIds: accountIdsForTrade,
        mistakeTagIds,
        mfeR: Math.max(rMultiple, 0) + random.int(0, 15) / 10,
        maeR: outcome === "Loss" ? 1 : random.int(0, 8) / 10,
        grade:
          outcome === "Win"
            ? random.pick(["A", "A", "B"])
            : random.pick(["B", "C", "D"]),
        felt:
          outcome === "Win"
            ? random.pick(["Confident", "Disciplined"])
            : random.pick(["Frustrated", "FOMO", "Neutral"]),
        byTheBook:
          strategyId !== undefined ? mistakeTagIds.length === 0 : undefined,
        notes: random.chance(0.6)
          ? random.pick(outcome === "Loss" ? LOSS_NOTES : WIN_NOTES)
          : undefined,
        links: random.chance(0.1)
          ? [{ url: "https://example.com/chart", label: "Chart" }]
          : [],
      });
      await saveOrThrow(userId, input);
      saved += 1;
    }
  }
  return saved;
}

async function saveOrThrow(
  userId: number,
  input: Parameters<typeof saveTrade>[1],
) {
  const result = await saveTrade(userId, input);
  if (!result.success) {
    throw new Error(
      `Could not save a demo trade on ${input.tradeDate}: ${result.error}`,
    );
  }
}

async function createJournalHabits(
  userId: number,
  days: IsoDate[],
  checklist: {
    id: number;
    phase: "premarket" | "trading" | "review";
    text: string;
  }[],
  random: ReturnType<typeof createRandom>,
) {
  const notes = days
    .filter(() => random.chance(0.8))
    .map((date) => ({
      userId,
      noteDate: date,
      premarketPlan:
        "Bias from the 1H trend. Levels: previous day high/low, overnight high/low. Max two trades.",
      eodReview: random.chance(0.7)
        ? random.pick([
            "Stuck to the plan.",
            "Overtraded after the first win.",
            "Good patience, one clean setup.",
          ])
        : null,
    }));
  if (notes.length > 0) await db.insert(dailyNotes).values(notes);

  const checks = days.flatMap((date) =>
    checklist
      .filter(() => random.chance(0.75))
      .map((item) => ({
        userId,
        checkDate: date,
        itemId: item.id,
        phase: item.phase,
        text: item.text,
      })),
  );
  if (checks.length > 0) await db.insert(dailyChecklistChecks).values(checks);
}

async function createWeeklyReviews(userId: number, today: IsoDate) {
  const currentWeek = reviewWeekStartOf(today);
  const reviews = [];
  for (let week = 1; week <= 10; week += 1) {
    // Two weeks left open, so the page shows gaps.
    if (week === 3 || week === 7) continue;
    reviews.push({
      userId,
      weekStart: shiftDate(currentWeek, -7 * week),
      whatWorked: "Waited for confirmation on most entries.",
      whatDidNotWork:
        week % 2 === 0
          ? "Took a trade into high-impact news."
          : "Moved the stop once.",
      focusNextWeek: "Max two trades a day, only A setups.",
    });
  }
  await db.insert(weeklyReviews).values(reviews);
}

async function createLedger(
  userId: number,
  accountIds: DemoAccounts,
  today: IsoDate,
) {
  await db.insert(ledgerEntries).values([
    {
      userId,
      accountId: accountIds.oldEval,
      entryDate: shiftDate(today, -HISTORY_DAYS),
      kind: "expense",
      category: "evaluation",
      amount: "167.00",
    },
    {
      userId,
      accountId: accountIds.oldEval,
      entryDate: shiftDate(today, -HISTORY_DAYS + 20),
      kind: "expense",
      category: "reset",
      amount: "80.00",
    },
    {
      userId,
      accountId: accountIds.apexOne,
      entryDate: shiftDate(today, -HISTORY_DAYS + 28),
      kind: "expense",
      category: "evaluation",
      amount: "167.00",
    },
    {
      userId,
      accountId: accountIds.apexTwo,
      entryDate: shiftDate(today, -HISTORY_DAYS + 28),
      kind: "expense",
      category: "evaluation",
      amount: "167.00",
    },
    {
      userId,
      accountId: accountIds.apexOne,
      entryDate: shiftDate(today, -70),
      kind: "expense",
      category: "activation",
      amount: "140.00",
    },
    {
      userId,
      accountId: accountIds.apexTwo,
      entryDate: shiftDate(today, -70),
      kind: "expense",
      category: "activation",
      amount: "140.00",
    },
    {
      userId,
      accountId: accountIds.legends,
      entryDate: shiftDate(today, -36),
      kind: "expense",
      category: "evaluation",
      amount: "149.00",
    },
    {
      userId,
      accountId: null,
      entryDate: shiftDate(today, -90),
      kind: "expense",
      category: "data",
      amount: "39.00",
      note: "Market data",
    },
    {
      userId,
      accountId: null,
      entryDate: shiftDate(today, -60),
      kind: "expense",
      category: "data",
      amount: "39.00",
      note: "Market data",
    },
    {
      userId,
      accountId: null,
      entryDate: shiftDate(today, -30),
      kind: "expense",
      category: "data",
      amount: "39.00",
      note: "Market data",
    },
    {
      userId,
      accountId: null,
      entryDate: shiftDate(today, -45),
      kind: "expense",
      category: "subscription",
      amount: "29.95",
      note: "Charting",
    },
    {
      userId,
      accountId: accountIds.apexOne,
      entryDate: shiftDate(today, -25),
      kind: "payout",
      amount: "1500.00",
    },
    {
      userId,
      accountId: accountIds.apexTwo,
      entryDate: shiftDate(today, -25),
      kind: "payout",
      amount: "1500.00",
    },
    {
      userId,
      accountId: accountIds.apexOne,
      entryDate: shiftDate(today, -6),
      kind: "payout",
      amount: "1000.00",
    },
  ]);
}

/** Freezes every finished month, as the month-close job would have. */
async function closePastMonths(userId: number, today: IsoDate) {
  const firstMonth = monthKeyOf(shiftDate(today, -HISTORY_DAYS));
  const currentMonth = monthKeyOf(today);
  let closed = 0;
  for (
    let month = firstMonth;
    month < currentMonth;
    month = shiftMonth(month, 1)
  ) {
    const scoreDays = await getMonthScoreDays(userId, month);
    await upsertMonthlyScore(
      userId,
      month,
      calculateConsistencyScore(scoreDays, month, today),
    );
    closed += 1;
  }
  return closed;
}

async function seedDemo() {
  assertLocalDatabase();
  const password = process.env.DEMO_USER_PASSWORD;
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Set DEMO_USER_PASSWORD (at least ${MIN_PASSWORD_LENGTH} characters) in .env.local before seeding.`,
    );
  }

  const today = calendarDateOf(new Date(), DEMO_TIMEZONE);
  const random = createRandom(20261027);
  const instrumentRows = await loadInstruments();
  const confluenceRows = await db
    .select({ id: confluenceTags.id, label: confluenceTags.label })
    .from(confluenceTags);
  const mistakeRows = await db
    .select({ id: mistakeTags.id, label: mistakeTags.label })
    .from(mistakeTags);
  if (confluenceRows.length === 0 || mistakeRows.length === 0) {
    throw new Error("Trade tags missing — run pnpm db:seed:trade-tags first.");
  }

  await resetDemoUser();
  const userId = await createDemoUser(password, today);
  const accountIds = await createAccounts(userId, today);
  await addCommissionRates(
    [accountIds.apexOne, accountIds.apexTwo, accountIds.legends],
    new Map([...instrumentRows].map(([symbol, row]) => [symbol, row.id])),
  );
  const strategyIds = await createStrategies(userId);
  const checklist = await createChecklist(userId);

  const days = tradingDays(today, random);
  const tradeCount = await createTrades(
    userId,
    days,
    accountIds,
    instrumentRows,
    strategyIds,
    {
      confluence: new Map(confluenceRows.map((row) => [row.label, row.id])),
      mistake: new Map(mistakeRows.map((row) => [row.label, row.id])),
    },
    random,
    today,
  );

  // Archived only now: a new trade may not go onto an archived account.
  await db
    .update(accounts)
    .set({
      archivedAt: new Date(`${shiftDate(today, -HISTORY_DAYS + 30)}T18:00:00Z`),
    })
    .where(eq(accounts.id, accountIds.oldEval));

  await createJournalHabits(userId, days, checklist, random);
  await createWeeklyReviews(userId, today);
  await createLedger(userId, accountIds, today);
  const closedMonths = await closePastMonths(userId, today);
  const badges = await syncUserBadges(userId, DEMO_TIMEZONE);

  console.log(
    `Seeded '${DEMO_USERNAME}': ${tradeCount} entries on ${days.length} days, ${closedMonths} closed month(s), ${badges.length} badge(s).`,
  );
  process.exit(0);
}

seedDemo().catch((error) => {
  console.error(error);
  process.exit(1);
});

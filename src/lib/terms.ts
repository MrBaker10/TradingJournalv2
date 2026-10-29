// The in-app explanations behind the info icons (Design.md, Info popover).
// Worded from GLOSSARY.md, which stays the source of truth and is never read
// at runtime; src/lib/__tests__/terms.test.ts checks that every entry named
// here still exists there.

export interface TermExplanation {
  /** As the term appears beside the icon and in its accessible label. */
  name: string;
  /** The GLOSSARY.md entries the text is worded from. */
  glossaryEntries: readonly string[];
  text: string;
}

export const TERM_EXPLANATIONS = {
  missedSetup: {
    name: "Missed setup",
    glossaryEntries: ["Missed setup"],
    text: "A trade you recognised but did not execute. It counts for your streak and badges, never for P&L, win rate or R.",
  },
  byTheBook: {
    name: "By the book",
    glossaryEntries: ["By the book"],
    text: "Your own assessment of whether a taken trade followed its assigned trading strategy, or your own trading rules when no strategy is assigned.",
  },
  practiceAccount: {
    name: "Practice account",
    glossaryEntries: ["Practice account"],
    text: "An account flagged as practice. It is left out of every combined figure and visible only when selected on its own.",
  },
  copyTrade: {
    name: "Copy trade",
    glossaryEntries: ["Copy trade"],
    text: "One trade assigned to several accounts because the same execution ran on each.",
  },
  streak: {
    name: "Streak",
    glossaryEntries: ["Streak"],
    text: "The run of consecutive logged days, skipping Saturdays and allowing one grace day per month. Only entries logged within 48 hours of their trade date count towards it.",
  },
  graceDay: {
    name: "Grace day",
    glossaryEntries: ["Grace day"],
    text: "The one skipped weekday per calendar month that does not break your streak.",
  },
  consistencyScore: {
    name: "Consistency score",
    glossaryEntries: ["Consistency score"],
    text: "A monthly score out of 100 for showing up, journaling completeness, plan adherence and review habit, never for results.",
  },
  chartClock: {
    name: "Chart clock",
    glossaryEntries: ["Chart clock"],
    text: "The wall-clock time you read off your chart. Entry and exit times are recorded in it.",
  },
  rMultiple: {
    name: "R multiple",
    glossaryEntries: ["R multiple"],
    text: "The result of a taken trade in units of its initial risk, the distance from entry to stop. A trade without a stop price has none.",
  },
  mfeMae: {
    name: "MFE / MAE",
    glossaryEntries: ["MFE", "MAE"],
    text: "Maximum favourable and adverse excursion: the furthest price moved in the trade's favour and against it before the exit, recorded by hand in R.",
  },
  ledgerNet: {
    name: "Ledger net",
    glossaryEntries: ["Ledger net"],
    text: "Payouts minus expenses. Real money, never combined with trading P&L.",
  },
} as const satisfies Record<string, TermExplanation>;

export type TermKey = keyof typeof TERM_EXPLANATIONS;

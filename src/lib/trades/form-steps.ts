import type { JournalTradeRow } from "@/db/queries/trades";
import type { TradeDirection } from "@/domain/pnl";

/**
 * The trade form as its inputs hold it: every field a controlled string, so
 * "" is "not filled in". New and edit share it (Design.md §3.5).
 */
export type TradeFormState = {
  taken: boolean;
  tradeDate: string;
  instrumentId: string;
  direction: "" | TradeDirection;
  entryTime: string;
  exitTime: string;
  entryPrice: string;
  exitPrice: string;
  stopPrice: string;
  contracts: string;
  session: string;
  /** A strategy id as a string; "" is no strategy. */
  strategyId: string;
  /** Replace the trade's stored revision with the strategy's current rules. */
  adoptCurrentStrategyRules: boolean;
  setupType: string;
  entryModel: string;
  confluenceTagIds: number[];
  mistakeTagIds: number[];
  mfeR: string;
  maeR: string;
  postExitMfeR: string;
  pnlOverride: string;
  result: string;
  grade: string;
  felt: string;
  byTheBook: boolean | undefined;
  notes: string;
  accountIds: number[];
  /**
   * Commission fields the user typed into, by account id. An account left out
   * shows — and saves — what `commissionOnSave` gives it.
   */
  commissions: Record<number, string>;
};

// No account is preselected: a practice account must never be picked for a
// real trade by default (Design.md §3.5).
export const EMPTY_TRADE_FORM: TradeFormState = {
  taken: true,
  tradeDate: "",
  instrumentId: "",
  direction: "",
  entryTime: "",
  exitTime: "",
  entryPrice: "",
  exitPrice: "",
  stopPrice: "",
  contracts: "",
  session: "",
  strategyId: "",
  adoptCurrentStrategyRules: false,
  setupType: "",
  entryModel: "",
  confluenceTagIds: [],
  mistakeTagIds: [],
  mfeR: "",
  maeR: "",
  postExitMfeR: "",
  pnlOverride: "",
  result: "",
  grade: "",
  felt: "",
  byTheBook: undefined,
  notes: "",
  accountIds: [],
  commissions: {},
};

// Every field is a controlled string, so a stored value has to come back as
// the string the input would have held. `null` means "not filled in" and maps
// to "", the same empty the create path starts from, which is what lets both
// modes share `tradePayload` unchanged.
export function formStateFromTrade(trade: JournalTradeRow): TradeFormState {
  const numberField = (value: number | null) =>
    value !== null ? String(value) : "";

  return {
    taken: trade.taken,
    tradeDate: trade.tradeDate,
    instrumentId: String(trade.instrumentId),
    direction: trade.direction,
    entryTime: trade.entryTime,
    exitTime: trade.exitTime ?? "",
    entryPrice: String(trade.entryPrice),
    exitPrice: numberField(trade.exitPrice),
    stopPrice: numberField(trade.stopPrice),
    contracts: numberField(trade.contracts),
    session: trade.session ?? "",
    strategyId:
      trade.strategy === null ? "" : String(trade.strategy.strategyId),
    adoptCurrentStrategyRules: false,
    setupType: trade.setupType ?? "",
    entryModel: trade.entryModel ?? "",
    confluenceTagIds: trade.confluences.map((confluence) => confluence.id),
    mistakeTagIds: trade.mistakes.map((mistake) => mistake.id),
    mfeR: numberField(trade.mfeR),
    maeR: numberField(trade.maeR),
    postExitMfeR: numberField(trade.postExitMfeR),
    pnlOverride: numberField(trade.pnlOverride),
    result: trade.result ?? "",
    grade: trade.grade ?? "",
    felt: trade.felt ?? "",
    byTheBook: trade.byTheBook ?? undefined,
    notes: trade.notes ?? "",
    accountIds: trade.accounts.map((account) => account.id),
    commissions: {},
  };
}

/**
 * The payload `createTrade` and `updateTrade` take, before the schema parses
 * it. `links` are the staged links of a new trade; on an existing trade they
 * are rows of their own, added and removed live, and the update ignores them.
 */
export function tradePayload(
  state: TradeFormState,
  links: { url: string; label?: string }[],
) {
  const shared = {
    tradeDate: state.tradeDate,
    instrumentId:
      state.instrumentId === "" ? undefined : Number(state.instrumentId),
    direction: state.direction === "" ? undefined : state.direction,
    entryTime: state.entryTime,
    entryPrice: parseNumber(state.entryPrice),
    stopPrice: parseNumber(state.stopPrice),
    session: state.session === "" ? undefined : state.session,
    strategyId: state.strategyId === "" ? null : Number(state.strategyId),
    adoptCurrentStrategyRules: state.adoptCurrentStrategyRules,
    setupType: state.setupType === "" ? undefined : state.setupType,
    entryModel: state.entryModel === "" ? undefined : state.entryModel,
    confluenceTagIds: state.confluenceTagIds,
    mistakeTagIds: state.mistakeTagIds,
    mfeR: parseNumber(state.mfeR),
    maeR: parseNumber(state.maeR),
    notes: state.notes.trim() === "" ? undefined : state.notes,
    felt: state.felt === "" ? undefined : state.felt,
    grade: state.grade === "" ? undefined : state.grade,
    links,
  };

  if (!state.taken) {
    return { ...shared, taken: false as const };
  }

  return {
    ...shared,
    taken: true as const,
    exitTime: state.exitTime,
    exitPrice: parseNumber(state.exitPrice),
    contracts: parseNumber(state.contracts),
    pnlOverride: parseNumber(state.pnlOverride),
    result: state.result === "" ? undefined : state.result,
    byTheBook: state.byTheBook,
    postExitMfeR: parseNumber(state.postExitMfeR),
    accountIds: state.accountIds,
    // Only the fields typed into, and only for accounts still selected.
    commissions: state.accountIds.flatMap((accountId) => {
      const typed = state.commissions[accountId];
      if (typed === undefined || typed.trim() === "") return [];
      return [{ accountId, amount: parseNumber(typed) }];
    }),
  };
}

/** The steps that hold required fields: What and Execution. */
export const REQUIRED_STEPS = [0, 1] as const;
/** From Why on, "Log now" skips the rest. */
export const LOG_NOW_FROM_STEP = 2;
/** Evidence, where ⌘V attaches a screenshot. */
export const EVIDENCE_STEP = 4;

export function parseNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * The required fields of one step that are still empty, by the names the
 * form shows. Only steps one and two hold required fields; whether a filled
 * value is valid stays the schema's job.
 */
export function missingInStep(state: TradeFormState, step: number): string[] {
  const missing: string[] = [];
  if (step === 0) {
    if (state.tradeDate === "") missing.push("Date");
    if (state.instrumentId === "") missing.push("Instrument");
    if (state.direction === "") missing.push("Direction");
    if (state.taken && state.accountIds.length === 0) missing.push("Accounts");
  }
  if (step === 1) {
    if (state.entryTime === "") missing.push("Entry time");
    if (state.taken && state.exitTime === "") missing.push("Exit time");
    if (parseNumber(state.entryPrice) === undefined)
      missing.push("Entry price");
    if (state.taken) {
      if (parseNumber(state.exitPrice) === undefined) {
        missing.push("Exit price");
      }
      if (parseNumber(state.contracts) === undefined) {
        missing.push("Contracts");
      }
    }
  }
  return missing;
}

// Which step holds each payload field, so an error from the schema or the
// server opens the step where it can be fixed.
const STEP_OF_FIELD: Record<string, number> = {
  taken: 0,
  tradeDate: 0,
  instrumentId: 0,
  direction: 0,
  accountIds: 0,
  entryTime: 1,
  exitTime: 1,
  entryPrice: 1,
  exitPrice: 1,
  stopPrice: 1,
  contracts: 1,
  mfeR: 1,
  maeR: 1,
  postExitMfeR: 1,
  pnlOverride: 1,
  commissions: 1,
  session: 2,
  setupType: 2,
  entryModel: 2,
  strategyId: 2,
  adoptCurrentStrategyRules: 2,
  confluenceTagIds: 2,
  grade: 3,
  felt: 3,
  result: 3,
  byTheBook: 3,
  mistakeTagIds: 3,
  notes: 3,
  links: 4,
};

export function stepOfField(field: string): number | undefined {
  return Object.hasOwn(STEP_OF_FIELD, field) ? STEP_OF_FIELD[field] : undefined;
}

/** The first step "Log now" has to send the trader back to, if any. */
export function firstBlockedStep(state: TradeFormState): number | undefined {
  return REQUIRED_STEPS.find((step) => missingInStep(state, step).length > 0);
}

/** What the echo needs from outside the form state. */
export interface Attached {
  instrumentSymbol: string | undefined;
  screenshots: number;
  links: number;
}

function count(n: number, noun: string): string | null {
  if (n === 0) return null;
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

function join(parts: (string | null | false)[]): string {
  return parts.filter(Boolean).join(" · ");
}

/**
 * What each step already holds, echoed under its name in the step rail.
 * Answers only: the rail never shows P&L or R (Design.md §1, money is shown,
 * never rewarded).
 */
export function stepEcho(state: TradeFormState, attached: Attached): string[] {
  const price =
    state.entryPrice !== "" &&
    (state.taken && state.exitPrice !== ""
      ? `${state.entryPrice} → ${state.exitPrice}`
      : state.entryPrice);
  return [
    join([
      attached.instrumentSymbol ?? null,
      state.direction !== "" && (state.direction === "long" ? "Long" : "Short"),
      !state.taken && "Missed",
    ]),
    join([state.entryTime, price]),
    join([
      state.session,
      state.setupType,
      count(state.confluenceTagIds.length, "confluence"),
    ]),
    join([
      state.grade !== "" && `Grade ${state.grade}`,
      state.felt,
      count(state.mistakeTagIds.length, "mistake"),
    ]),
    join([
      count(attached.screenshots, "screenshot"),
      count(attached.links, "link"),
    ]),
  ];
}

/** A step gets its check in the rail once it holds answers and misses none. */
export function isStepDone(
  state: TradeFormState,
  step: number,
  attached: Attached,
): boolean {
  return (
    stepEcho(state, attached)[step] !== "" &&
    missingInStep(state, step).length === 0
  );
}

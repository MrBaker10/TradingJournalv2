import { describe, expect, it } from "vitest";
import {
  EMPTY_TRADE_FORM,
  firstBlockedStep,
  isStepDone,
  missingInStep,
  stepEcho,
  stepOfField,
} from "../form-steps.ts";

describe("missingInStep", () => {
  it("names every required field of the first step on an empty taken trade", () => {
    expect(missingInStep(EMPTY_TRADE_FORM, 0)).toEqual([
      "Date",
      "Instrument",
      "Direction",
      "Accounts",
    ]);
  });

  it("asks a missed setup for no account, since nothing was executed", () => {
    const missed = { ...EMPTY_TRADE_FORM, taken: false };
    expect(missingInStep(missed, 0)).toEqual([
      "Date",
      "Instrument",
      "Direction",
    ]);
  });

  it("names the execution fields a taken trade needs", () => {
    const state = { ...EMPTY_TRADE_FORM, entryPrice: "abc", stopPrice: "" };
    expect(missingInStep(state, 1)).toEqual([
      "Entry time",
      "Exit time",
      "Entry price",
      "Exit price",
      "Contracts",
    ]);
  });

  it("asks a missed setup only for its entry", () => {
    const missed = { ...EMPTY_TRADE_FORM, taken: false, entryTime: "09:31" };
    expect(missingInStep(missed, 1)).toEqual(["Entry price"]);
  });

  it("finds nothing missing once the required fields are filled", () => {
    const state = {
      ...EMPTY_TRADE_FORM,
      entryTime: "09:31",
      exitTime: "09:52",
      entryPrice: "21500.25",
      exitPrice: "21510",
      contracts: "2",
    };
    expect(missingInStep(state, 1)).toEqual([]);
  });

  it("holds no required field after the second step", () => {
    for (const step of [2, 3, 4]) {
      expect(missingInStep(EMPTY_TRADE_FORM, step)).toEqual([]);
    }
  });
});

describe("stepOfField", () => {
  it("leads a field error to the step that holds the field", () => {
    expect(stepOfField("accountIds")).toBe(0);
    expect(stepOfField("contracts")).toBe(1);
    expect(stepOfField("postExitMfeR")).toBe(1);
    expect(stepOfField("commissions")).toBe(1);
    expect(stepOfField("strategyId")).toBe(2);
    expect(stepOfField("notes")).toBe(3);
    expect(stepOfField("links")).toBe(4);
  });

  it("has no step for an error that belongs to no field", () => {
    expect(stepOfField("form")).toBeUndefined();
    expect(stepOfField("toString")).toBeUndefined();
  });
});

describe("stepEcho", () => {
  const nothing = { instrumentSymbol: undefined, screenshots: 0, links: 0 };

  it("echoes nothing for a step with no answer yet", () => {
    expect(stepEcho(EMPTY_TRADE_FORM, nothing)).toEqual(["", "", "", "", ""]);
  });

  it("echoes the answers of every step, never a money figure", () => {
    const state = {
      ...EMPTY_TRADE_FORM,
      instrumentId: "3",
      direction: "long" as const,
      entryTime: "09:31",
      entryPrice: "21500.25",
      exitPrice: "21510",
      contracts: "2",
      session: "NY-AM",
      setupType: "Reversal",
      confluenceTagIds: [1, 2],
      grade: "A",
      felt: "Confident",
      mistakeTagIds: [7],
    };
    expect(
      stepEcho(state, { instrumentSymbol: "NQ", screenshots: 1, links: 2 }),
    ).toEqual([
      "NQ · Long",
      "09:31 · 21500.25 → 21510",
      "NY-AM · Reversal · 2 confluences",
      "Grade A · Confident · 1 mistake",
      "1 screenshot · 2 links",
    ]);
  });

  it("marks a missed setup in the first step", () => {
    const missed = {
      ...EMPTY_TRADE_FORM,
      taken: false,
      direction: "short" as const,
    };
    expect(stepEcho(missed, nothing)[0]).toBe("Short · Missed");
  });
});

const QUICK_ENTRY = {
  ...EMPTY_TRADE_FORM,
  tradeDate: "2026-10-27",
  instrumentId: "3",
  direction: "long" as const,
  accountIds: [1],
  entryTime: "09:31",
  exitTime: "09:52",
  entryPrice: "21500.25",
  exitPrice: "21510",
  contracts: "2",
};

describe("firstBlockedStep", () => {
  it("finds the first step with a required field missing", () => {
    expect(firstBlockedStep(EMPTY_TRADE_FORM)).toBe(0);
    expect(firstBlockedStep({ ...QUICK_ENTRY, contracts: "" })).toBe(1);
  });

  it("lets a quick entry with only the first two steps filled be logged", () => {
    expect(firstBlockedStep(QUICK_ENTRY)).toBeUndefined();
  });
});

describe("isStepDone", () => {
  const attached = { instrumentSymbol: "NQ", screenshots: 0, links: 0 };

  it("checks a step that holds answers and misses nothing", () => {
    expect(isStepDone(QUICK_ENTRY, 0, attached)).toBe(true);
    expect(isStepDone({ ...QUICK_ENTRY, grade: "B" }, 3, attached)).toBe(true);
  });

  it("does not check a step with a required field still missing", () => {
    expect(isStepDone({ ...QUICK_ENTRY, accountIds: [] }, 0, attached)).toBe(
      false,
    );
  });

  it("does not check an optional step left empty", () => {
    expect(isStepDone(QUICK_ENTRY, 2, attached)).toBe(false);
  });
});

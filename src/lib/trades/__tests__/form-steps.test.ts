import { describe, expect, it } from "vitest";
import { takenTradeSchema } from "../../../schemas/trades.ts";
import {
  EMPTY_TRADE_FORM,
  firstBlockedStep,
  isStepDone,
  missingInStep,
  stepEcho,
  stepOfField,
  tradePayload,
  unreadableInStep,
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
    const state = { ...EMPTY_TRADE_FORM, entryPrice: " ", stopPrice: "" };
    expect(missingInStep(state, 1)).toEqual([
      "Entry time",
      "Exit time",
      "Entry price",
      "Exit price",
      "Contracts",
    ]);
  });

  it("leaves a typed but unreadable value to the schema, not to missing", () => {
    const state = {
      ...EMPTY_TRADE_FORM,
      entryTime: "09:31",
      exitTime: "09:52",
      entryPrice: "1.234,5",
      exitPrice: "abc",
      contracts: "1 000",
    };
    expect(missingInStep(state, 1)).toEqual([]);
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

describe("tradePayload — decimal input", () => {
  // A taken trade with every required field, prices typed as given.
  function taken(fields: Partial<typeof EMPTY_TRADE_FORM>) {
    return takenTradeSchema.safeParse(
      tradePayload(
        {
          ...EMPTY_TRADE_FORM,
          tradeDate: "2026-10-29",
          instrumentId: "1",
          direction: "long",
          entryTime: "09:31",
          exitTime: "09:52",
          entryPrice: "21234.50",
          exitPrice: "21240.25",
          contracts: "1",
          accountIds: [7],
          ...fields,
        },
        [],
      ),
    );
  }

  it("saves comma prices as the values a dot gives", () => {
    const comma = taken({ entryPrice: "21234,50", exitPrice: "21240,25" });
    const dot = taken({ entryPrice: "21234.50", exitPrice: "21240.25" });
    expect(comma.success && comma.data.entryPrice).toBe(21234.5);
    expect(comma.success && comma.data.exitPrice).toBe(21240.25);
    expect(comma.data).toEqual(dot.data);
  });

  it("reads a comma in stop, contracts, P&L override and commission", () => {
    const result = taken({
      stopPrice: "21230,75",
      contracts: "0,5",
      pnlOverride: "-12,5",
      commissions: { 7: "4,80" },
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.stopPrice).toBe(21230.75);
    expect(result.data.contracts).toBe(0.5);
    expect(result.data.pnlOverride).toBe(-12.5);
    expect(result.data.commissions).toEqual([{ accountId: 7, amount: 4.8 }]);
  });

  it("refuses a thousands separator at the field", () => {
    for (const typed of ["1.234,5", "1,234.5", "1 234,5"]) {
      const result = taken({ entryPrice: typed, stopPrice: typed });
      expect(result.success).toBe(false);
      const fields = result.error?.issues.map((issue) => issue.path[0]);
      expect(fields).toContain("entryPrice");
      expect(fields).toContain("stopPrice");
    }
  });

  it("names the number format for every unreadable field", () => {
    const result = taken({
      entryPrice: "1.234,5",
      contracts: "1 000",
      pnlOverride: "1,234.5",
      mfeR: "1.5.0",
    });
    const messages = Object.fromEntries(
      (result.error?.issues ?? []).map((issue) => [
        issue.path[0],
        issue.message,
      ]),
    );
    expect(messages).toEqual({
      entryPrice: "Enter the price as a number",
      contracts: "Enter the contracts as a number",
      pnlOverride: "Enter the P&L as a number",
      mfeR: "Enter the R as a number",
    });
  });

  it("keeps the scale limits with a comma", () => {
    expect(taken({ contracts: "0,1234" }).success).toBe(true);
    expect(taken({ contracts: "0,12345" }).success).toBe(false);
    expect(taken({ commissions: { 7: "4,85" } }).success).toBe(true);
    expect(taken({ commissions: { 7: "4,855" } }).success).toBe(false);
  });
});

describe("unreadableInStep", () => {
  it("names the typed fields of a step that are no decimal", () => {
    const state = {
      ...EMPTY_TRADE_FORM,
      entryPrice: "1.234,5",
      exitPrice: "21240,25",
      stopPrice: "abc",
      contracts: "1 000",
      pnlOverride: "-12,5",
      accountIds: [7, 8],
      commissions: { 7: "4,80", 8: "4.800,00" },
    };
    expect(unreadableInStep(state, 1)).toEqual([
      "entryPrice",
      "stopPrice",
      "contracts",
      "commissions",
    ]);
  });

  it("leaves empty fields to missingInStep", () => {
    expect(unreadableInStep(EMPTY_TRADE_FORM, 1)).toEqual([]);
  });

  it("ignores the execution fields a missed setup does not send", () => {
    const missed = {
      ...EMPTY_TRADE_FORM,
      taken: false,
      entryPrice: "21234,5",
      exitPrice: "abc",
      contracts: "abc",
    };
    expect(unreadableInStep(missed, 1)).toEqual([]);
  });

  it("has nothing to read outside the execution step", () => {
    const state = { ...EMPTY_TRADE_FORM, entryPrice: "abc" };
    for (const step of [0, 2, 3, 4]) {
      expect(unreadableInStep(state, step)).toEqual([]);
    }
  });
});

describe("isStepDone — unreadable values", () => {
  it("does not check a step that holds a value the schema cannot read", () => {
    const state = {
      ...EMPTY_TRADE_FORM,
      entryTime: "09:31",
      exitTime: "09:52",
      entryPrice: "1.234,5",
      exitPrice: "21510",
      contracts: "2",
    };
    const attached = { instrumentSymbol: "NQ", screenshots: 0, links: 0 };
    expect(isStepDone(state, 1, attached)).toBe(false);
  });
});

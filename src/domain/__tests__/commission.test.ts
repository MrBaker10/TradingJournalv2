import { describe, expect, it } from "vitest";
import {
  amountToCents,
  centsToAmount,
  commissionFromRate,
  commissionInFilePnl,
  commissionOnSave,
  commissionShare,
  importCommission,
  mayReplaceCommission,
  parseCommissionCents,
} from "../commission.ts";

describe("parseCommissionCents", () => {
  it("reads the amounts a Tradovate fill carries, exactly", () => {
    expect(parseCommissionCents("1.5")).toBe(150);
    expect(parseCommissionCents("0.8")).toBe(80);
    expect(parseCommissionCents("0.5")).toBe(50);
    expect(parseCommissionCents("2")).toBe(200);
    expect(parseCommissionCents(" 4.80 ")).toBe(480);
  });

  it("does not read an empty cell as a free trade", () => {
    expect(parseCommissionCents("")).toBeNull();
  });

  it("rejects what is not a non-negative amount with at most two decimals", () => {
    for (const raw of ["-1", "1.234", "abc", "1,5", "1.", ".5"]) {
      expect(parseCommissionCents(raw)).toBeNull();
    }
  });
});

describe("commissionFromRate", () => {
  it("charges every contract on both sides", () => {
    // Lucid: MNQ $0.50 and MGC $0.80 per side.
    expect(commissionFromRate(50, 3)).toBe(300);
    expect(commissionFromRate(80, 12)).toBe(1920);
  });

  it("is zero for a zero rate", () => {
    expect(commissionFromRate(0, 5)).toBe(0);
  });

  it("rounds a fractional lot half-up to the cent", () => {
    // 7 × 2 × 1.0001 = 14.0014 cents → 14.
    expect(commissionFromRate(7, 1.0001)).toBe(14);
    // 25 × 2 × 0.01 = 0.5 → 1.
    expect(commissionFromRate(25, 0.01)).toBe(1);
  });

  it("refuses a rate that is not whole non-negative cents", () => {
    expect(() => commissionFromRate(-1, 1)).toThrow(RangeError);
    expect(() => commissionFromRate(0.5, 1)).toThrow(RangeError);
  });
});

describe("commissionShare", () => {
  it("gives the whole amount when the whole fill belongs to one trip", () => {
    expect(commissionShare(150, 3, 3)).toBe(150);
  });

  it("splits a fill so that both shares add up to the charge", () => {
    const closing = commissionShare(100, 1, 3);
    expect(closing).toBe(33);
    expect(100 - closing).toBe(67);
    expect(commissionShare(150, 1, 3)).toBe(50);
  });
});

describe("mayReplaceCommission", () => {
  it("never replaces a hand-typed amount", () => {
    expect(mayReplaceCommission("manual", "file")).toBe(false);
    expect(mayReplaceCommission("manual", "rate")).toBe(false);
  });

  it("lets a file amount replace a rate-derived or older file amount", () => {
    expect(mayReplaceCommission("rate", "file")).toBe(true);
    expect(mayReplaceCommission("file", "file")).toBe(true);
  });

  it("lets a rate refresh only its own result", () => {
    expect(mayReplaceCommission("rate", "rate")).toBe(true);
    expect(mayReplaceCommission("file", "rate")).toBe(false);
  });

  it("fills a gap from any source", () => {
    expect(mayReplaceCommission(null, "file")).toBe(true);
    expect(mayReplaceCommission(null, "rate")).toBe(true);
  });
});

describe("centsToAmount / amountToCents", () => {
  it("round-trips through the stored numeric form", () => {
    for (const cents of [0, 5, 80, 150, 1920, 123456]) {
      expect(amountToCents(centsToAmount(cents))).toBe(cents);
    }
    expect(centsToAmount(5)).toBe("0.05");
    expect(centsToAmount(1920)).toBe("19.20");
  });
});

describe("commissionOnSave", () => {
  const base = {
    typedCents: undefined,
    existing: null,
    perSideCents: 50,
    contracts: 2,
    basisChanged: false,
    pnlFromFile: false,
  };

  it("fills a new assignment from the account's rate", () => {
    expect(commissionOnSave(base)).toEqual({ cents: 200, source: "rate" });
  });

  it("leaves a new assignment unknown without a rate", () => {
    expect(commissionOnSave({ ...base, perSideCents: null })).toBeNull();
  });

  it("stores what the user typed as theirs", () => {
    expect(
      commissionOnSave({
        ...base,
        typedCents: 175,
        existing: { cents: 300, source: "file" },
      }),
    ).toEqual({ cents: 175, source: "manual" });
  });

  it("keeps a file or typed amount even when the contracts change", () => {
    for (const source of ["file", "manual"] as const) {
      expect(
        commissionOnSave({
          ...base,
          existing: { cents: 300, source },
          basisChanged: true,
        }),
      ).toEqual({ cents: 300, source });
    }
  });

  it("does not let a changed rate rewrite a saved trade", () => {
    // The rate is now 0.50, the trade was saved at 0.40 × 2 × 2.
    expect(
      commissionOnSave({ ...base, existing: { cents: 160, source: "rate" } }),
    ).toEqual({ cents: 160, source: "rate" });
  });

  it("recomputes a rate-derived amount when the contracts change", () => {
    expect(
      commissionOnSave({
        ...base,
        contracts: 3,
        existing: { cents: 200, source: "rate" },
        basisChanged: true,
      }),
    ).toEqual({ cents: 300, source: "rate" });
  });

  it("keeps a rate-derived amount when the rate is gone", () => {
    expect(
      commissionOnSave({
        ...base,
        perSideCents: null,
        existing: { cents: 200, source: "rate" },
        basisChanged: true,
      }),
    ).toEqual({ cents: 200, source: "rate" });
  });

  it("takes no rate while the P&L is a file's own, which is net already", () => {
    // An FTMO row: profit, commission and swap are all in pnl_override.
    expect(commissionOnSave({ ...base, pnlFromFile: true })).toBeNull();
    expect(
      commissionOnSave({ ...base, pnlFromFile: true, typedCents: 150 }),
    ).toEqual({ cents: 150, source: "manual" });
  });
});

describe("importCommission", () => {
  const base = {
    fileCents: null,
    commissionInFilePnl: false,
    perSideCents: 50,
    contracts: 3,
  };

  it("takes what the file charged over the account's rate", () => {
    expect(importCommission({ ...base, fileCents: 300 })).toEqual({
      cents: 300,
      source: "file",
    });
  });

  it("falls back to the account's rate", () => {
    expect(importCommission(base)).toEqual({ cents: 300, source: "rate" });
  });

  it("is unknown without either", () => {
    expect(importCommission({ ...base, perSideCents: null })).toBeNull();
  });

  it("writes nothing for a row whose file P&L already has it taken off", () => {
    expect(importCommission({ ...base, commissionInFilePnl: true })).toBeNull();
  });
});

describe("commissionInFilePnl", () => {
  it("is always true for FTMO, an open position without a P&L included", () => {
    expect(commissionInFilePnl("ftmo", null)).toBe(true);
    expect(commissionInFilePnl("ftmo", 5676)).toBe(true);
  });

  it("is false for a fill-level file, which reports no P&L", () => {
    expect(commissionInFilePnl("fills", null)).toBe(false);
  });

  it("is true for any file that reports its own P&L", () => {
    expect(commissionInFilePnl("round-trip", 1200)).toBe(true);
  });
});

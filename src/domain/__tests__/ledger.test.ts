import { describe, expect, it } from "vitest";
import {
  ledgerNetCents,
  signedLedgerCents,
  validateLedgerCategory,
  validateLedgerEntry,
} from "../ledger.ts";

describe("validateLedgerEntry", () => {
  it("passes an expense with a category", () => {
    expect(
      validateLedgerEntry({
        kind: "expense",
        category: "evaluation",
        amountCents: 15_000,
      }),
    ).toEqual({ success: true });
  });

  it("passes a payout without a category", () => {
    expect(
      validateLedgerEntry({ kind: "payout", category: null, amountCents: 1 }),
    ).toEqual({ success: true });
  });

  it("passes a free reset at zero", () => {
    expect(
      validateLedgerEntry({
        kind: "expense",
        category: "reset",
        amountCents: 0,
      }),
    ).toEqual({ success: true });
  });

  it("fails an expense without a category", () => {
    expect(
      validateLedgerEntry({
        kind: "expense",
        category: null,
        amountCents: 100,
      }),
    ).toEqual({
      success: false,
      field: "category",
      error: "validation.ledgerCategoryMissing",
    });
  });

  it("fails a payout with a category", () => {
    expect(
      validateLedgerEntry({
        kind: "payout",
        category: "data",
        amountCents: 100,
      }),
    ).toEqual({
      success: false,
      field: "category",
      error: "validation.ledgerCategoryOnPayout",
    });
  });

  it("fails a negative amount: the kind carries the sign", () => {
    expect(
      validateLedgerEntry({ kind: "payout", category: null, amountCents: -1 }),
    ).toEqual({
      success: false,
      field: "amount",
      error: "validation.ledgerAmountNegative",
    });
  });

  it("fails an amount that is not whole cents", () => {
    expect(
      validateLedgerEntry({ kind: "payout", category: null, amountCents: 1.5 }),
    ).toEqual({
      success: false,
      field: "amount",
      error: "validation.ledgerAmountFormat",
    });
  });
});

describe("validateLedgerCategory", () => {
  it("needs a category on an expense and none on a payout", () => {
    expect(validateLedgerCategory("expense", "data")).toEqual({
      success: true,
    });
    expect(validateLedgerCategory("payout", null)).toEqual({ success: true });
    expect(validateLedgerCategory("expense", null).success).toBe(false);
    expect(validateLedgerCategory("payout", "reset").success).toBe(false);
  });
});

describe("ledgerNetCents", () => {
  it("is payouts minus expenses", () => {
    expect(
      ledgerNetCents({ payoutsCents: 50_000, expensesCents: 15_099 }),
    ).toBe(34_901);
  });

  it("goes negative when expenses outweigh payouts", () => {
    expect(ledgerNetCents({ payoutsCents: 0, expensesCents: 30_000 })).toBe(
      -30_000,
    );
  });

  it("is zero with nothing recorded", () => {
    expect(ledgerNetCents({ payoutsCents: 0, expensesCents: 0 })).toBe(0);
  });
});

describe("signedLedgerCents", () => {
  it("lets a payout come in and an expense go out", () => {
    expect(signedLedgerCents({ kind: "payout", amountCents: 150_000 })).toBe(
      150_000,
    );
    expect(signedLedgerCents({ kind: "expense", amountCents: 3_900 })).toBe(
      -3_900,
    );
  });

  it("keeps a free expense at 0, never -0", () => {
    expect(
      Object.is(signedLedgerCents({ kind: "expense", amountCents: 0 }), 0),
    ).toBe(true);
  });
});

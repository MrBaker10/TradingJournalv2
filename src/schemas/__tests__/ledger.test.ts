import { describe, expect, it } from "vitest";
import { createLedgerEntrySchema } from "../ledger.ts";

const valid = {
  kind: "expense",
  category: "reset",
  entryDate: "2026-10-19",
  amount: 0,
  note: "",
  accountId: null,
} as const;

function fieldErrors(input: unknown): Record<string, string> {
  const result = createLedgerEntrySchema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(
    result.error.issues.map((issue) => [issue.path.join("."), issue.message]),
  );
}

describe("createLedgerEntrySchema", () => {
  it("accepts a free reset and stores an empty note as null", () => {
    const result = createLedgerEntrySchema.safeParse(valid);
    expect(result.success && result.data.note).toBeNull();
  });

  it("reports a missing category even while the amount is empty", () => {
    // The form shows every field's message at once; an unreadable amount
    // must not hide the category rule.
    expect(
      fieldErrors({ ...valid, category: null, amount: Number.NaN }),
    ).toEqual({
      amount: "Amount in USD — digits and up to two decimals.",
      category: "Pick a category for this expense.",
    });
  });

  it("refuses a category on a payout", () => {
    expect(fieldErrors({ ...valid, kind: "payout" })).toEqual({
      category: "A payout has no category.",
    });
  });

  it("refuses a third decimal and a negative amount", () => {
    expect(fieldErrors({ ...valid, amount: 1.005 })).toHaveProperty("amount");
    expect(fieldErrors({ ...valid, amount: -1 })).toEqual({
      amount: "The amount cannot be negative.",
    });
  });
});

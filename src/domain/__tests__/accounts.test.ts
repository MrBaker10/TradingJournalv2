import { describe, expect, it } from "vitest";
import {
  type AccountForSwitcher,
  groupAccountsForSwitcher,
} from "../accounts.ts";

describe("groupAccountsForSwitcher", () => {
  const account = (
    overrides: Partial<AccountForSwitcher>,
  ): AccountForSwitcher => ({
    id: 1,
    name: "Account",
    isPractice: false,
    sortOrder: 0,
    archivedAt: null,
    ...overrides,
  });

  it("never includes archived accounts", () => {
    const result = groupAccountsForSwitcher([
      account({ id: 1, archivedAt: new Date() }),
      account({ id: 2 }),
    ]);
    expect(result.real.map((a) => a.id)).toEqual([2]);
  });

  it("sorts real accounts by sortOrder regardless of input order", () => {
    const result = groupAccountsForSwitcher([
      account({ id: 1, sortOrder: 2 }),
      account({ id: 2, sortOrder: 0 }),
      account({ id: 3, sortOrder: 1 }),
    ]);
    expect(result.real.map((a) => a.id)).toEqual([2, 3, 1]);
  });

  it("sorts practice accounts by sortOrder in their own group", () => {
    const result = groupAccountsForSwitcher([
      account({ id: 1, isPractice: true, sortOrder: 1 }),
      account({ id: 2, isPractice: true, sortOrder: 0 }),
    ]);
    expect(result.practice.map((a) => a.id)).toEqual([2, 1]);
  });

  it("returns an empty real group when every account is practice", () => {
    const result = groupAccountsForSwitcher([
      account({ id: 1, isPractice: true }),
    ]);
    expect(result.real).toEqual([]);
  });

  it("returns both groups empty for empty input", () => {
    expect(groupAccountsForSwitcher([])).toEqual({ real: [], practice: [] });
  });
});

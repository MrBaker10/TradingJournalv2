import { describe, expect, it } from "vitest";
import {
  type AccountForSwitcher,
  type AssignedAccount,
  applyMoneyMultiplier,
  contributesToMoneyAggregate,
  countMultiplier,
  excludePracticeAccounts,
  groupAccountsForSwitcher,
  realAccountMultiplier,
} from "../accounts.ts";

const mixedAssignment: AssignedAccount[] = [
  { accountId: 1, isPractice: false },
  { accountId: 2, isPractice: false },
  { accountId: 3, isPractice: true },
];

describe("realAccountMultiplier", () => {
  it("returns 0 for an empty assignment", () => {
    expect(realAccountMultiplier([])).toBe(0);
  });

  it("counts every account when all are real", () => {
    expect(
      realAccountMultiplier([
        { accountId: 1, isPractice: false },
        { accountId: 2, isPractice: false },
      ]),
    ).toBe(2);
  });

  it("returns 0 when all accounts are practice", () => {
    expect(
      realAccountMultiplier([
        { accountId: 1, isPractice: true },
        { accountId: 2, isPractice: true },
      ]),
    ).toBe(0);
  });

  it("counts only the real accounts in a mixed assignment", () => {
    expect(realAccountMultiplier(mixedAssignment)).toBe(2);
  });

  it("returns 1 for a single real account", () => {
    expect(realAccountMultiplier([{ accountId: 1, isPractice: false }])).toBe(
      1,
    );
  });

  it("returns 0 for a single practice account", () => {
    expect(realAccountMultiplier([{ accountId: 1, isPractice: true }])).toBe(0);
  });
});

describe("countMultiplier", () => {
  it("is always 1, regardless of assignment", () => {
    expect(countMultiplier()).toBe(1);
  });
});

describe("applyMoneyMultiplier", () => {
  it("multiplies a winning trade by the real account count", () => {
    expect(applyMoneyMultiplier(50000, mixedAssignment)).toBe(100000);
  });

  it("multiplies a losing trade and keeps the sign", () => {
    expect(applyMoneyMultiplier(-50000, mixedAssignment)).toBe(-100000);
  });

  it("returns 0 for a practice-only assignment", () => {
    expect(
      applyMoneyMultiplier(50000, [{ accountId: 1, isPractice: true }]),
    ).toBe(0);
  });

  it("returns 0 for an empty assignment", () => {
    expect(applyMoneyMultiplier(50000, [])).toBe(0);
  });
});

describe("contributesToMoneyAggregate", () => {
  it("is true when at least one real account is assigned", () => {
    expect(contributesToMoneyAggregate(mixedAssignment)).toBe(true);
  });

  it("is false when every assigned account is practice", () => {
    expect(
      contributesToMoneyAggregate([{ accountId: 1, isPractice: true }]),
    ).toBe(false);
  });

  it("is false for an empty assignment", () => {
    expect(contributesToMoneyAggregate([])).toBe(false);
  });
});

describe("excludePracticeAccounts", () => {
  it("drops practice entries and keeps the rest in order", () => {
    const items = [
      { id: 1, isPractice: false },
      { id: 2, isPractice: true },
      { id: 3, isPractice: false },
    ];
    expect(excludePracticeAccounts(items)).toEqual([
      { id: 1, isPractice: false },
      { id: 3, isPractice: false },
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(excludePracticeAccounts([])).toEqual([]);
  });

  it("returns an empty array when everything is practice", () => {
    expect(excludePracticeAccounts([{ id: 1, isPractice: true }])).toEqual([]);
  });

  it("returns every item unchanged when nothing is practice", () => {
    const items = [{ id: 1, isPractice: false }];
    expect(excludePracticeAccounts(items)).toEqual(items);
  });
});

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

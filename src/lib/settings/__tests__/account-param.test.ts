import { describe, expect, it } from "vitest";
import { accountSearch, resolveAccountParam } from "../account-param.ts";

const active = [{ id: 4 }, { id: 9 }, { id: 2 }];
const archived = [{ id: 7 }];

describe("the settings `account` parameter", () => {
  it("opens one of the user's active accounts with its place in the list", () => {
    expect(resolveAccountParam("9", active, archived)).toEqual({
      kind: "active",
      account: { id: 9 },
      position: 2,
      total: 3,
      previous: { id: 4 },
      next: { id: 2 },
    });
  });

  it("opens nothing for an id that is not one of the user's accounts", () => {
    expect(resolveAccountParam("31", active, archived)).toBeNull();
  });

  it("wraps previous and next around the ends of the list", () => {
    const first = resolveAccountParam("4", active, archived);
    const last = resolveAccountParam("2", active, archived);

    expect(first?.kind === "active" && first.previous).toEqual({ id: 2 });
    expect(last?.kind === "active" && last.next).toEqual({ id: 4 });
  });

  it("opens nothing for an id written another way or no parameter", () => {
    expect(resolveAccountParam("09", active, archived)).toBeNull();
    expect(resolveAccountParam(" 9", active, archived)).toBeNull();
    expect(resolveAccountParam(null, active, archived)).toBeNull();
  });

  it("opens the empty editor for `new`", () => {
    expect(resolveAccountParam("new", active, archived)).toEqual({
      kind: "new",
    });
  });

  it("opens an archived account outside the active count", () => {
    expect(resolveAccountParam("7", active, archived)).toEqual({
      kind: "archived",
      account: { id: 7 },
    });
  });

  it("writes the open account into the query and keeps the rest", () => {
    expect(accountSearch("?tab=x", 9)).toBe("?tab=x&account=9");
    expect(accountSearch("?account=9", "new")).toBe("?account=new");
  });

  it("drops the parameter when the sheet closes", () => {
    expect(accountSearch("?account=9&tab=x", null)).toBe("?tab=x");
    expect(accountSearch("?account=9", null)).toBe("");
  });
});

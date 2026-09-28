import { describe, expect, it } from "vitest";
import {
  buildEconHref,
  type EconState,
  parseEconState,
  toggleCurrency,
} from "../href.ts";

const initial: EconState = { tab: "today", highOnly: false, currencies: [] };

describe("parseEconState", () => {
  it("defaults to today, every impact, every currency", () => {
    expect(parseEconState({})).toEqual(initial);
  });

  it("reads tab, high impact and currencies", () => {
    expect(parseEconState({ tab: "both", high: "1", cur: "USD,EUR" })).toEqual({
      tab: "both",
      highOnly: true,
      currencies: ["EUR", "USD"],
    });
  });

  it("falls back on an unknown tab and ignores a stray high value", () => {
    expect(parseEconState({ tab: "last", high: "yes" })).toEqual(initial);
  });

  it("keeps only currency codes, once each", () => {
    expect(parseEconState({ cur: "usd,USD,,EURO,<b>,JPY" }).currencies).toEqual(
      ["JPY", "USD"],
    );
  });

  it("takes the first of a repeated parameter", () => {
    expect(parseEconState({ tab: ["next", "both"] }).tab).toBe("next");
  });
});

describe("buildEconHref", () => {
  it("is the bare path for the default view", () => {
    expect(buildEconHref(initial)).toBe("/econ-calendar");
  });

  it("writes every week tab, since today is the default", () => {
    expect(buildEconHref(initial, { tab: "this" })).toBe(
      "/econ-calendar?tab=this",
    );
  });

  it("writes only what differs from the default", () => {
    expect(
      buildEconHref(initial, { tab: "next", currencies: ["USD", "EUR"] }),
    ).toBe("/econ-calendar?tab=next&cur=EUR%2CUSD");
    expect(buildEconHref({ ...initial, highOnly: true })).toBe(
      "/econ-calendar?high=1",
    );
  });

  it("round-trips through parseEconState", () => {
    const state: EconState = {
      tab: "both",
      highOnly: true,
      currencies: ["EUR", "USD"],
    };
    const query = new URLSearchParams(buildEconHref(state).split("?")[1]);
    expect(parseEconState(Object.fromEntries(query))).toEqual(state);
  });
});

describe("toggleCurrency", () => {
  it("adds in order and removes", () => {
    expect(toggleCurrency(["USD"], "EUR")).toEqual(["EUR", "USD"]);
    expect(toggleCurrency(["EUR", "USD"], "USD")).toEqual(["EUR"]);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildPropFirmsHref,
  effectiveSizes,
  parsePropFirmsState,
} from "../href.ts";

describe("prop firm page state", () => {
  it("reads several sizes in USD and writes them back the same way", () => {
    const state = parsePropFirmsState({ size: ["50000", "100000"] });

    expect(state.sizes).toEqual([50_000, 100_000]);
    expect(buildPropFirmsHref(state)).toBe(
      "/prop-firms?size=50000&size=100000",
    );
  });

  it("drops a size that is not a positive whole number of dollars, and repeats", () => {
    const state = parsePropFirmsState({
      size: ["50k", "-5", "0", "12.5", "", "50000", "50000"],
    });

    expect(state.sizes).toEqual([50_000]);
  });

  it("keeps search, tags and compare next to the sizes", () => {
    const state = parsePropFirmsState({
      q: "100k",
      tag: "EOD",
      size: "100000",
      compare: "3,7",
    });

    expect(state).toEqual({
      search: "100k",
      tags: ["EOD"],
      sizes: [100_000],
      compare: [3, 7],
    });
    expect(buildPropFirmsHref(state)).toBe(
      "/prop-firms?q=100k&tag=EOD&size=100000&compare=3%2C7",
    );
  });
});

describe("prop firm size choice", () => {
  it("reads and writes an explicit Any size", () => {
    const state = parsePropFirmsState({ size: "any", q: "eod" });

    expect(state.anySize).toBe(true);
    expect(state.sizes).toEqual([]);
    expect(buildPropFirmsHref(state)).toBe("/prop-firms?q=eod&size=any");
    expect(buildPropFirmsHref(state, { anySize: false, sizes: [50_000] })).toBe(
      "/prop-firms?q=eod&size=50000",
    );
  });

  it("opens on the size of the first linked account when the URL names none", () => {
    const state = parsePropFirmsState({});

    expect(effectiveSizes(state, [100_000, 50_000])).toEqual([100_000]);
  });

  it("opens on Any size when no account is linked", () => {
    expect(effectiveSizes(parsePropFirmsState({}), [])).toEqual([]);
  });

  it("lets a size in the URL win over the linked account", () => {
    const state = parsePropFirmsState({ size: "25000" });

    expect(effectiveSizes(state, [100_000])).toEqual([25_000]);
  });

  it("keeps Any size once it was chosen, even with a linked account", () => {
    const state = parsePropFirmsState({ size: "any" });

    expect(effectiveSizes(state, [100_000])).toEqual([]);
  });
});

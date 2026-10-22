import { describe, expect, it } from "vitest";
import { buildPropFirmsHref, parsePropFirmsState } from "../href.ts";

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

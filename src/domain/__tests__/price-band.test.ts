import { describe, expect, it } from "vitest";
import {
  buildPriceBand,
  LABEL_GAP,
  type PriceBand,
  type PriceBandInput,
} from "../price-band.ts";

function input(overrides: Partial<PriceBandInput> = {}): PriceBandInput {
  return {
    taken: true,
    entryPrice: 100,
    stopPrice: 99,
    rMultiple: 2,
    mfeR: 2.5,
    maeR: 0.4,
    postExitMfeR: null,
    ...overrides,
  };
}

function band(overrides: Partial<PriceBandInput> = {}): PriceBand {
  const result = buildPriceBand(input(overrides));
  if (result === null) throw new Error("expected a band");
  return result;
}

function marker(result: PriceBand, kind: "stop" | "entry" | "exit") {
  return result.markers.find((item) => item.kind === kind);
}

describe("buildPriceBand — when there is a band", () => {
  it("returns null without a stop price, because R is undefined", () => {
    expect(buildPriceBand(input({ stopPrice: null }))).toBeNull();
  });

  it("returns null when the stop sits on the entry", () => {
    expect(buildPriceBand(input({ stopPrice: 100 }))).toBeNull();
  });
});

describe("buildPriceBand — axis", () => {
  it("places stop at -1R and entry at 0R, whatever the direction", () => {
    // A short with the stop above the entry reads the same as a long.
    const result = band({ entryPrice: 100, stopPrice: 101 });
    expect(marker(result, "stop")?.r).toBe(-1);
    expect(marker(result, "entry")?.r).toBe(0);
    expect(marker(result, "exit")?.r).toBe(2);
  });

  it("spans at least -1R to +1R even for a tiny trade", () => {
    const result = band({ rMultiple: 0.2, mfeR: 0.3, maeR: 0.1 });
    expect(result.min).toBeLessThan(-1);
    expect(result.max).toBeGreaterThan(1);
  });

  it("widens to an MAE beyond the stop and an MFE beyond the exit", () => {
    const result = band({ rMultiple: -1, maeR: 1.6, mfeR: 3.2 });
    expect(result.min).toBeLessThan(-1.6);
    expect(result.max).toBeGreaterThan(3.2);
  });

  it("counts MFE and MAE by magnitude, as analytics does", () => {
    const positive = band({ maeR: 0.4, mfeR: 2.5 });
    const negative = band({ maeR: -0.4, mfeR: -2.5 });
    expect(negative.mae).toEqual(positive.mae);
    expect(negative.mfe).toEqual(positive.mfe);
  });

  it("keeps every position inside 0–100", () => {
    const result = band({ rMultiple: 4, mfeR: 5, maeR: 2, postExitMfeR: 3 });
    const positions = [
      ...result.markers.map((item) => item.position),
      ...result.ticks.map((tick) => tick.position),
    ];
    for (const position of positions) {
      expect(position).toBeGreaterThanOrEqual(0);
      expect(position).toBeLessThanOrEqual(100);
    }
  });

  it("puts ticks on whole R and always includes 0", () => {
    const result = band({ rMultiple: 2, mfeR: 2.5 });
    expect(result.ticks.map((tick) => tick.r)).toEqual([-1, 0, 1, 2]);
  });

  it("thins the ticks out on a long axis", () => {
    const result = band({ rMultiple: 12, mfeR: 14, maeR: 0.5 });
    const values = result.ticks.map((tick) => tick.r);
    expect(values).toContain(0);
    expect(values.length).toBeLessThanOrEqual(9);
    for (const value of values) expect(value % 2).toBe(0);
  });
});

describe("buildPriceBand — spans and tone", () => {
  it("draws the realised stretch from entry to exit in gain tone for a winner", () => {
    const result = band({ rMultiple: 2 });
    expect(result.realised?.tone).toBe("gain");
    expect(result.realised?.from).toBe(marker(result, "entry")?.position);
    expect(result.realised?.to).toBe(marker(result, "exit")?.position);
  });

  it("draws a loser in loss tone, from exit to entry", () => {
    const result = band({ rMultiple: -0.6, mfeR: 0.3, maeR: 0.8 });
    expect(result.realised?.tone).toBe("loss");
    expect(result.realised?.from).toBe(marker(result, "exit")?.position);
    expect(result.realised?.to).toBe(marker(result, "entry")?.position);
  });

  it("runs the post-exit stretch onward from the exit", () => {
    const result = band({ rMultiple: 1, postExitMfeR: 1.5, mfeR: 1.2 });
    expect(result.postExit?.from).toBe(marker(result, "exit")?.position);
    expect(result.max).toBeGreaterThan(2.5);
  });

  it("leaves out spans that were not entered", () => {
    const result = band({ mfeR: null, maeR: null, postExitMfeR: null });
    expect(result.mfe).toBeNull();
    expect(result.mae).toBeNull();
    expect(result.postExit).toBeNull();
  });
});

describe("buildPriceBand — missed setup", () => {
  it("has no exit and nothing realised, only the would-be MFE", () => {
    // The row carries the would-be R in rMultiple for a missed setup; it must
    // never turn into an exit marker or a green stretch.
    const result = band({ taken: false, rMultiple: 1.8, mfeR: 1.8 });
    expect(marker(result, "exit")).toBeUndefined();
    expect(result.realised).toBeNull();
    expect(result.postExit).toBeNull();
    expect(result.mfe).not.toBeNull();
  });
});

describe("buildPriceBand — label lanes", () => {
  it("keeps all labels in the first lane when they are far apart", () => {
    const result = band({ rMultiple: 2 });
    expect(result.markers.every((item) => item.lane === 0)).toBe(true);
  });

  it("moves an exit on the stop into the second lane", () => {
    const result = band({ rMultiple: -1, mfeR: 0.2, maeR: 1 });
    expect(marker(result, "stop")?.lane).toBe(0);
    expect(marker(result, "exit")?.lane).toBe(1);
  });

  it("never lets two labels in one lane overlap", () => {
    const result = band({ rMultiple: 0.1, mfeR: 9, maeR: 0.2 });
    for (const lane of [0, 1, 2]) {
      const labels = result.markers
        .filter((item) => item.lane === lane)
        .sort((a, b) => a.labelFrom - b.labelFrom);
      for (let i = 1; i < labels.length; i++) {
        expect(
          labels[i].labelFrom - labels[i - 1].labelTo,
        ).toBeGreaterThanOrEqual(LABEL_GAP);
      }
    }
  });

  it("stacks labels that fit a wide band but not a narrow one", () => {
    // Same trade, measured at two widths: a label is a smaller share of a
    // wide band. The lane choice follows the real width, not a fixed percent.
    const trade = input({
      rMultiple: 2.4,
      mfeR: 3,
      maeR: 0.3,
      postExitMfeR: 1,
    });
    const wide = buildPriceBand(trade, { stop: 8, entry: 9, exit: 9 });
    const narrow = buildPriceBand(trade, { stop: 16, entry: 18, exit: 18 });
    expect(wide?.markers.every((item) => item.lane === 0)).toBe(true);
    expect(narrow?.markers.find((item) => item.kind === "entry")?.lane).toBe(1);
  });

  it("anchors a label at the edge so it does not run off the band", () => {
    const result = band({ rMultiple: -1, mfeR: 0.1, maeR: 1 });
    expect(marker(result, "stop")?.anchor).toBe("start");
    expect(marker(result, "entry")?.anchor).toBe("middle");
    for (const item of result.markers) {
      expect(item.labelFrom).toBeGreaterThanOrEqual(0);
      expect(item.labelTo).toBeLessThanOrEqual(100);
    }
  });
});

import { describe, expect, it } from "vitest";
import { strikeLines } from "../pen-strike.ts";

const ORIGIN = { left: 100, top: 200 };

describe("strikeLines", () => {
  it("draws one line per text line, each starting when the one before ends", () => {
    // A step that wraps onto two lines, 20 px high each.
    const lines = strikeLines(
      [
        { left: 100, top: 200, width: 450, height: 20 },
        { left: 100, top: 220, width: 180, height: 20 },
      ],
      ORIGIN,
    );

    expect(lines).toEqual([
      { left: 0, top: 11.2, width: 450, delay: 0, duration: 0.5 },
      { left: 0, top: 31.2, width: 180, delay: 0.5, duration: 0.2 },
    ]);
  });

  it("keeps a constant pen speed, so a longer line takes longer", () => {
    const [short, long] = strikeLines(
      [
        { left: 100, top: 200, width: 90, height: 20 },
        { left: 100, top: 220, width: 270, height: 20 },
      ],
      ORIGIN,
    );

    expect(short.duration).toBeCloseTo(0.1);
    expect(long.duration).toBeCloseTo(0.3);
  });

  it("gives a very short line a minimum duration so the stroke stays visible", () => {
    const [line] = strikeLines(
      [{ left: 100, top: 200, width: 36, height: 20 }],
      ORIGIN,
    );

    expect(line.duration).toBe(0.08);
  });

  it("skips empty line boxes the browser reports at a wrap", () => {
    const lines = strikeLines(
      [
        { left: 100, top: 200, width: 0, height: 20 },
        { left: 100, top: 200, width: 450, height: 20 },
      ],
      ORIGIN,
    );

    expect(lines).toHaveLength(1);
    expect(lines[0].delay).toBe(0);
  });
});

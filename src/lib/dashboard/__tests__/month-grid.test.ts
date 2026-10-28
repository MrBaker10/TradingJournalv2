import { describe, expect, it } from "vitest";
import { monthGrid } from "../month-grid.ts";

describe("monthGrid", () => {
  it("covers the month in Monday-first weeks, padded with the neighbours' days", () => {
    // October 2026 starts on a Thursday and ends on a Saturday.
    const weeks = monthGrid("2026-10", "2026-10-27", []);

    expect(weeks).toHaveLength(5);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks[0].map((cell) => cell.date)).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(weeks[4].at(-1)?.date).toBe("2026-11-01");
  });

  it("marks the days outside the month and today", () => {
    const cells = monthGrid("2026-10", "2026-10-27", []).flat();

    expect(
      cells.filter((cell) => !cell.inMonth).map((cell) => cell.date),
    ).toEqual(["2026-09-28", "2026-09-29", "2026-09-30", "2026-11-01"]);
    expect(
      cells.filter((cell) => cell.isToday).map((cell) => cell.date),
    ).toEqual(["2026-10-27"]);
  });

  it("puts each day total on its own date and leaves the others empty", () => {
    const total = {
      date: "2026-10-14",
      entryCount: 2,
      amountCents: -4500,
    };
    const cells = monthGrid("2026-10", "2026-10-27", [total]).flat();

    expect(cells.find((cell) => cell.date === "2026-10-14")?.day).toBe(total);
    expect(cells.filter((cell) => cell.day !== undefined)).toHaveLength(1);
  });

  it("needs six weeks for a month that starts on a Sunday", () => {
    // November 2026 starts on a Sunday and has 30 days.
    const weeks = monthGrid("2026-11", "2026-10-27", []);

    expect(weeks).toHaveLength(6);
    expect(weeks[0][6].date).toBe("2026-11-01");
    expect(weeks[5][0].date).toBe("2026-11-30");
  });
});

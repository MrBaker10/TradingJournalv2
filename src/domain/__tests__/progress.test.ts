import { describe, expect, it } from "vitest";
import { heatmapWeeks } from "../progress.ts";

describe("heatmapWeeks", () => {
  // Tuesday, 27 October 2026.
  const today = "2026-10-27";

  function cellOf(
    weeks: ReturnType<typeof heatmapWeeks>,
    date: string,
  ): ReturnType<typeof heatmapWeeks>[number][number] | undefined {
    return weeks.flat().find((cell) => cell.date === date);
  }

  it("covers 26 weeks of Monday to Friday, oldest first, ending in this week", () => {
    const weeks = heatmapWeeks({ today, loggedDates: [], graceDays: [] });

    expect(weeks).toHaveLength(26);
    expect(weeks.every((week) => week.length === 5)).toBe(true);
    expect(weeks[0].map((cell) => cell.date)).toEqual([
      "2026-05-04",
      "2026-05-05",
      "2026-05-06",
      "2026-05-07",
      "2026-05-08",
    ]);
    expect(weeks[25].map((cell) => cell.date)).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
    ]);
  });

  it("marks logged days, open days and the days still to come", () => {
    const weeks = heatmapWeeks({
      today,
      loggedDates: ["2026-10-26"],
      graceDays: [],
    });

    expect(weeks[25].map((cell) => cell.state)).toEqual([
      "logged",
      "open",
      "future",
      "future",
      "future",
    ]);
  });

  it("outlines today and nothing else", () => {
    const weeks = heatmapWeeks({ today, loggedDates: [], graceDays: [] });

    expect(
      weeks
        .flat()
        .filter((cell) => cell.isToday)
        .map((cell) => cell.date),
    ).toEqual([today]);
  });

  it("dashes the grace day of every month in view", () => {
    const weeks = heatmapWeeks({
      today,
      loggedDates: [],
      graceDays: ["2026-09-09", "2026-10-14"],
    });

    expect(cellOf(weeks, "2026-09-09")?.state).toBe("grace");
    expect(cellOf(weeks, "2026-10-14")?.state).toBe("grace");
  });

  // Trading day (GLOSSARY.md): a Sunday rolls onto Monday, a Saturday belongs
  // to no trading day.
  it("puts a Sunday entry on the Monday after and drops a Saturday one", () => {
    const weeks = heatmapWeeks({
      today,
      loggedDates: ["2026-10-18", "2026-10-24"],
      graceDays: [],
    });

    expect(cellOf(weeks, "2026-10-19")?.state).toBe("logged");
    expect(weeks.flat().filter((cell) => cell.state === "logged")).toHaveLength(
      1,
    );
  });

  it("ignores logged days outside the 26 weeks", () => {
    const weeks = heatmapWeeks({
      today,
      loggedDates: ["2026-05-01"],
      graceDays: [],
    });

    expect(weeks.flat().some((cell) => cell.state === "logged")).toBe(false);
  });

  // On a Sunday the next trading day is Monday, so the heatmap already shows
  // the week that opens tomorrow; Saturday still belongs to the week behind it.
  it("ends in the week of today's trading day", () => {
    const sunday = heatmapWeeks({
      today: "2026-11-01",
      loggedDates: [],
      graceDays: [],
    });
    const saturday = heatmapWeeks({
      today: "2026-10-31",
      loggedDates: [],
      graceDays: [],
    });

    expect(sunday[25][0].date).toBe("2026-11-02");
    expect(saturday[25][0].date).toBe("2026-10-26");
    expect(sunday.flat().some((cell) => cell.isToday)).toBe(false);
  });
});

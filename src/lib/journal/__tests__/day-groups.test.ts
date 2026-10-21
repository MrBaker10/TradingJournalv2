import { describe, expect, it } from "vitest";
import { journalLayout } from "../day-groups.ts";

function row(id: number, tradeDate: string) {
  return { id, tradeDate };
}

describe("journalLayout", () => {
  it("keeps the list flat, in the given order, when sorted by R", () => {
    const rows = [
      row(1, "2026-10-20"),
      row(2, "2026-10-14"),
      row(3, "2026-10-20"),
    ];

    expect(journalLayout(rows, [], "r")).toEqual({ kind: "flat", rows });
  });

  it("groups by trade date when sorted by date, in the order the rows come", () => {
    // Newest first, as the query returns a descending date sort.
    const rows = [
      row(1, "2026-10-20"),
      row(2, "2026-10-20"),
      row(3, "2026-10-19"),
    ];
    const days = [
      { date: "2026-10-19", entryCount: 1, missedCount: 0 },
      { date: "2026-10-20", entryCount: 2, missedCount: 1 },
    ];

    expect(journalLayout(rows, days, "date")).toEqual({
      kind: "days",
      days: [
        {
          date: "2026-10-20",
          entryCount: 2,
          missedCount: 1,
          rows: [row(1, "2026-10-20"), row(2, "2026-10-20")],
        },
        {
          date: "2026-10-19",
          entryCount: 1,
          missedCount: 0,
          rows: [row(3, "2026-10-19")],
        },
      ],
    });
  });

  it("keeps an ascending sort ascending", () => {
    const rows = [row(3, "2026-10-19"), row(1, "2026-10-20")];
    const days = [
      { date: "2026-10-20", entryCount: 1, missedCount: 0 },
      { date: "2026-10-19", entryCount: 1, missedCount: 0 },
    ];

    const layout = journalLayout(rows, days, "date");

    expect(
      layout.kind === "days" ? layout.days.map((day) => day.date) : null,
    ).toEqual(["2026-10-19", "2026-10-20"]);
  });

  it("heads a day cut by the page boundary with the whole day's counts", () => {
    // Only one of the day's four entries made it onto this page.
    const rows = [row(9, "2026-10-13")];
    const days = [{ date: "2026-10-13", entryCount: 4, missedCount: 2 }];

    const layout = journalLayout(rows, days, "date");

    expect(layout.kind === "days" ? layout.days[0] : null).toMatchObject({
      entryCount: 4,
      missedCount: 2,
    });
  });

  it("refuses a page date without day values instead of heading it with zero", () => {
    expect(() =>
      journalLayout([row(1, "2026-10-20")], [], "date"),
    ).toThrowError(/2026-10-20/);
  });
});

import { describe, expect, it } from "vitest";
import { groupFirmCards, sizeLabels } from "../cards.ts";

// A filtered row as the page query returns it, cut down to what the cards read.
function row(
  firmId: number,
  programId: number,
  name: string,
  accountSizeCents: number | null,
) {
  return {
    firm: { id: firmId, name: `Firm ${firmId}` },
    program: { id: programId, name, accountSizeCents },
  };
}

describe("groupFirmCards", () => {
  it("puts each firm's matching programs on one card, in the order the rows come", () => {
    // Firm then position, as the query orders them.
    const rows = [
      row(2, 21, "Rapid 25k", 2_500_000),
      row(2, 22, "Rapid 50k", 5_000_000),
      row(1, 11, "Select 50k", 5_000_000),
    ];

    const cards = groupFirmCards(rows, []);

    expect(cards.map((card) => card.firm.id)).toEqual([2, 1]);
    expect(cards[0].programs.map((program) => program.id)).toEqual([21, 22]);
    expect(cards[1].programs.map((program) => program.id)).toEqual([11]);
  });

  it("opens on the smallest matching size, wherever the curator put it", () => {
    // The curator wrote 100k before 50k; the smaller size still wins.
    const rows = [
      row(1, 11, "Select 100k", 10_000_000),
      row(1, 12, "Select 50k", 5_000_000),
      row(1, 13, "Select 150k", 15_000_000),
    ];

    expect(groupFirmCards(rows, [])[0].preselectedId).toBe(12);
  });

  it("opens on the first program by position when no size is known", () => {
    const rows = [
      row(1, 12, "50k Test → PRO", null),
      row(1, 11, "100k Test → PRO", null),
    ];

    expect(groupFirmCards(rows, [])[0].preselectedId).toBe(12);
  });

  it("opens on the firm's program in the compare selection, over the smallest size", () => {
    const rows = [
      row(1, 11, "Select 50k", 5_000_000),
      row(1, 12, "Select 100k", 10_000_000),
      row(2, 21, "Rapid 50k", 5_000_000),
    ];

    const cards = groupFirmCards(rows, [12]);

    expect(cards[0].preselectedId).toBe(12);
    // A firm with nothing in compare keeps its own default.
    expect(cards[1].preselectedId).toBe(21);
  });

  it("opens on the one picked first when two sizes of the firm are compared", () => {
    const rows = [
      row(1, 11, "Select 50k", 5_000_000),
      row(1, 12, "Select 100k", 10_000_000),
      row(1, 13, "Select 150k", 15_000_000),
    ];

    expect(groupFirmCards(rows, [13, 12])[0].preselectedId).toBe(13);
  });

  it("opens on the filtered size when exactly one size is filtered", () => {
    // The query leaves only 100k programs: two product lines of one firm,
    // written Pro before Rapid. No compare, so the earlier position wins.
    const rows = [
      row(1, 12, "Pro 100k", 10_000_000),
      row(1, 11, "Rapid 100k", 10_000_000),
    ];

    expect(groupFirmCards(rows, [])[0].preselectedId).toBe(12);
    // Compare still comes first when it holds one of them.
    expect(groupFirmCards(rows, [11])[0].preselectedId).toBe(11);
  });

  it("ignores a compared program the filters took out of the card", () => {
    // 99 is compared but filtered out, so it cannot be what the card shows.
    const rows = [
      row(1, 11, "Select 50k", 5_000_000),
      row(1, 12, "Select 100k", 10_000_000),
    ];

    expect(groupFirmCards(rows, [99, 12])[0].preselectedId).toBe(12);
  });
});

describe("sizeLabels", () => {
  function program(id: number, name: string, accountSizeCents: number | null) {
    return { id, name, accountSizeCents };
  }

  it("labels each size in thousands, the way traders say it", () => {
    const labels = sizeLabels([
      program(1, "Select 25k", 2_500_000),
      program(2, "Select 150k", 15_000_000),
      program(3, "Mini 7.5k", 750_000),
    ]);

    expect(labels).toEqual(["25k", "150k", "7.5k"]);
  });

  it("falls back to every program name when one size is unknown", () => {
    const labels = sizeLabels([
      program(1, "Select 50k", 5_000_000),
      program(2, "Select Custom", null),
    ]);

    expect(labels).toEqual(["Select 50k", "Select Custom"]);
  });

  it("falls back to every program name when two programs share a size", () => {
    const labels = sizeLabels([
      program(1, "Rapid 50k", 5_000_000),
      program(2, "Pro 50k", 5_000_000),
      program(3, "Pro 100k", 10_000_000),
    ]);

    expect(labels).toEqual(["Rapid 50k", "Pro 50k", "Pro 100k"]);
  });
});

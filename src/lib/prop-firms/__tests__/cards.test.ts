import { describe, expect, it } from "vitest";
import { orderCatalogue } from "../cards.ts";

// A filtered row as the page query returns it, cut down to what the cards read.
function row(firmId: number, programId: number) {
  return { firm: { id: firmId }, program: { id: programId } };
}

describe("orderCatalogue", () => {
  it("puts linked programs first and keeps the query's order on both sides", () => {
    const rows = [row(1, 11), row(1, 12), row(2, 21), row(3, 31)];
    const links = [
      { programId: 31, accountName: "Eval B" },
      { programId: 12, accountName: "Eval A" },
    ];

    const cards = orderCatalogue(rows, links);

    expect(cards.map((card) => card.row.program.id)).toEqual([12, 31, 11, 21]);
  });

  it("carries the name of every account linked to a program", () => {
    const cards = orderCatalogue(
      [row(1, 11), row(2, 21)],
      [
        { programId: 21, accountName: "Eval A" },
        { programId: 21, accountName: "Eval B" },
      ],
    );

    expect(cards).toEqual([
      { row: row(2, 21), accountNames: ["Eval A", "Eval B"] },
      { row: row(1, 11), accountNames: [] },
    ]);
  });

  it("ignores a link to a program the filters left out", () => {
    const cards = orderCatalogue(
      [row(1, 11)],
      [{ programId: 99, accountName: "Eval" }],
    );

    expect(cards).toEqual([{ row: row(1, 11), accountNames: [] }]);
  });
});

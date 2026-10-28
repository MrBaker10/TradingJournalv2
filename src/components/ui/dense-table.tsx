import { ChevronRight } from "lucide-react";

// The chrome of the dense table (Design.md §3.4), shared by the ledger, econ
// calendar, strategies and settings accounts. Each table keeps its own
// columns; keyboard navigation is `moveRowFocus` in ./row-focus.

/**
 * The scroll box. `relative` makes it the containing block of the stretched
 * row openers and the sr-only header, or they would widen the page at 390 px.
 */
export const TABLE_BOX = "relative overflow-x-auto rounded-xl border";

export const TABLE_HEAD_ROW =
  "border-b bg-muted/30 text-left text-muted-foreground text-xs";

/** A header cell; add `text-right` over a figure column. */
export const TABLE_HEAD_CELL = "px-4 py-2 font-normal";

/**
 * A body row: hover, keyboard focus on its opener, and `aria-current` for
 * the row whose sheet is open. Tables add `align-top` and the last row's
 * border as their layout needs.
 */
export const TABLE_ROW =
  "group relative border-b transition-colors duration-150 hover:bg-accent has-focus-visible:bg-accent has-focus-visible:ring-3 has-focus-visible:ring-ring/50 aria-current:bg-muted";

/** The row's button, stretched over the whole row so any of it opens. */
export const ROW_OPENER = "text-left outline-none after:absolute after:inset-0";

/** The header over the chevron column. */
export function OpenColumnHead() {
  return (
    <th className="w-8">
      <span className="sr-only">Open</span>
    </th>
  );
}

/** The last cell of a row: a chevron that nudges on hover. */
export function ChevronCell() {
  return (
    <td className="py-2.5 pr-3">
      <ChevronRight
        aria-hidden="true"
        className="size-4 text-muted-foreground transition-[translate] duration-150 group-hover:translate-x-0.5"
      />
    </td>
  );
}

// What the 38px instrument tile of a trade row prints (Design.md §4.9).
//
// A futures root is two or three characters and fits at the tile's normal
// size. A CFD symbol does not: `US100.cash` is ten. The tile shows the part
// before the first dot — the suffix is the broker's account class, not the
// instrument — and a label of five characters or more is set smaller so it
// stays inside the tile. From seven characters the compact label also runs
// with tighter tracking, or it would touch the tile's edges (decided
// 2026-09-26). The full symbol stays readable next to the tile (decided
// 2026-09-25).

/** From this length on the label is set in the compact size. */
const COMPACT_FROM = 5;

/** From this length the compact label also gets tighter tracking. */
const TIGHT_FROM = 7;

export interface TileLabel {
  text: string;
  /** True when the label needs the smaller size to fit the tile. */
  compact: boolean;
  /** True when the compact label also needs tighter tracking. */
  tight: boolean;
}

export function tileLabel(symbol: string): TileLabel {
  const dot = symbol.indexOf(".");
  const text = dot > 0 ? symbol.slice(0, dot) : symbol;
  return {
    text,
    compact: text.length >= COMPACT_FROM,
    tight: text.length >= TIGHT_FROM,
  };
}

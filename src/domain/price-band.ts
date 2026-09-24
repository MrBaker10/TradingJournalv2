// The price band on the trade detail page: one trade drawn on an R axis —
// stop at -1R, entry at 0, exit at the realised R — with the MAE and MFE
// spans and the post-exit run beside it. Design.md §4.21.
//
// Contract:
//
// - **Geometry only.** Every number that leaves this module is a position in
//   percent of the band's width, an R value to print, or a lane index. There
//   is no cents value here and nothing is aggregated; the R values arrive
//   finished on the trade row. The floats produced are layout ratios, the
//   same kind `capturedShare` in execution.ts hands out.
// - **R, not price.** A long and a short read the same way: the stop is
//   always left of the entry. The prices are only labels, and the caller
//   prints them.
// - **No stop, no band.** R is undefined without a stop distance, so a trade
//   without a stop (or with the stop on the entry) gets `null`.
// - MFE and MAE count by **magnitude**, as in analytics (decisions.md, S12b):
//   the form does not say which sign to type.
// - A missed setup has no exit. Its `rMultiple` is the would-be R (Design.md
//   §4.9); it never becomes an exit marker or a realised stretch.

export interface PriceBandInput {
  taken: boolean;
  entryPrice: number;
  stopPrice: number | null;
  /** Realised R for a taken trade, the would-be R for a missed setup. */
  rMultiple: number | null;
  mfeR: number | null;
  maeR: number | null;
  postExitMfeR: number | null;
}

export type BandMarkerKind = "stop" | "entry" | "exit";

export interface BandMarker {
  kind: BandMarkerKind;
  r: number;
  /** 0–100, percent of the band's width. */
  position: number;
  /** 0 is the lane nearest the axis; a label moves up when it would collide. */
  lane: number;
  anchor: "start" | "middle" | "end";
  /** Where the label ends up, in percent — after anchoring. */
  labelFrom: number;
  labelTo: number;
}

/**
 * How wide each marker's label is, in percent of the band's current width.
 * The caller measures the band; only it knows how many pixels a percent is.
 */
export type LabelWidths = Record<BandMarkerKind, number>;

/** A stretch of the axis, `from <= to`, both in percent. */
export interface BandSpan {
  from: number;
  to: number;
}

export interface PriceBand {
  /** The R values at the left and right edge, padding included. */
  min: number;
  max: number;
  markers: BandMarker[];
  /** Entry to exit. The only part of the band that may carry gain or loss. */
  realised: (BandSpan & { tone: "gain" | "loss" }) | null;
  mae: BandSpan | null;
  mfe: BandSpan | null;
  postExit: BandSpan | null;
  ticks: { r: number; position: number }[];
}

/** Room left between two labels in one lane, in percent. */
export const LABEL_GAP = 2;

/** Used before the band has been measured: a label is about a seventh wide. */
export const DEFAULT_LABEL_WIDTHS: LabelWidths = {
  stop: 14,
  entry: 14,
  exit: 14,
};

/** Share of the span added on each side, so no marker sits on the edge. */
const PADDING = 0.06;

/** Above this many whole R, ticks thin out to every second, third … R. */
const MAX_TICKS = 8;

export function buildPriceBand(
  input: PriceBandInput,
  labelWidths: LabelWidths = DEFAULT_LABEL_WIDTHS,
): PriceBand | null {
  if (input.stopPrice === null || input.stopPrice === input.entryPrice) {
    return null;
  }

  const exitR = input.taken ? input.rMultiple : null;
  const mae = input.maeR === null ? null : Math.abs(input.maeR);
  const mfe = input.mfeR === null ? null : Math.abs(input.mfeR);
  const post =
    exitR === null || input.postExitMfeR === null
      ? null
      : Math.abs(input.postExitMfeR);

  const low = Math.min(-1, mae === null ? 0 : -mae, exitR === null ? 0 : exitR);
  const high = Math.max(
    1,
    mfe ?? 0,
    exitR ?? 0,
    exitR !== null && post !== null ? exitR + post : 0,
  );
  const pad = (high - low) * PADDING;
  const min = low - pad;
  const max = high + pad;

  const at = (r: number) =>
    Math.round(((r - min) / (max - min)) * 100 * 100) / 100;

  const points: { kind: BandMarkerKind; r: number }[] = [
    { kind: "stop", r: -1 },
    { kind: "entry", r: 0 },
  ];
  if (exitR !== null) points.push({ kind: "exit", r: exitR });

  return {
    min,
    max,
    markers: assignLanes(
      points.map((point) => ({ ...point, position: at(point.r) })),
      labelWidths,
    ),
    realised:
      exitR === null
        ? null
        : {
            from: at(Math.min(0, exitR)),
            to: at(Math.max(0, exitR)),
            tone: exitR >= 0 ? "gain" : "loss",
          },
    mae: mae === null ? null : { from: at(-mae), to: at(0) },
    mfe: mfe === null ? null : { from: at(0), to: at(mfe) },
    postExit:
      exitR === null || post === null
        ? null
        : { from: at(exitR), to: at(exitR + post) },
    ticks: wholeRTicks(low, high).map((r) => ({ r, position: at(r) })),
  };
}

// A label is centred on its marker unless that would run it off an edge; then
// it is anchored to the edge. Lanes are greedy, left to right: each label takes
// the lowest lane whose last label ends LABEL_GAP before this one starts.
// Three markers never need more than three lanes.
function assignLanes(
  points: { kind: BandMarkerKind; r: number; position: number }[],
  labelWidths: LabelWidths,
): BandMarker[] {
  const laneEnds: number[] = [];
  const byPosition = [...points].sort((a, b) => a.position - b.position);

  const placed = byPosition.map((point): BandMarker => {
    const width = labelWidths[point.kind];
    const anchor: BandMarker["anchor"] =
      point.position - width / 2 < 0
        ? "start"
        : point.position + width / 2 > 100
          ? "end"
          : "middle";
    const labelFrom =
      anchor === "start"
        ? point.position
        : anchor === "end"
          ? point.position - width
          : point.position - width / 2;
    const labelTo = labelFrom + width;

    let lane = laneEnds.findIndex((end) => end + LABEL_GAP <= labelFrom);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = labelTo;

    return { ...point, lane, anchor, labelFrom, labelTo };
  });

  // Back to stop, entry, exit, so callers can rely on the order.
  return points.map(
    (point) => placed.find((item) => item.kind === point.kind) as BandMarker,
  );
}

function wholeRTicks(low: number, high: number): number[] {
  const step = Math.max(1, Math.ceil((high - low) / MAX_TICKS));
  const ticks: number[] = [];
  // `+ 0` turns a -0 from Math.ceil into 0, so 0 prints and compares as 0.
  for (let r = Math.ceil(low / step) * step + 0; r <= high; r += step) {
    ticks.push(r + 0);
  }
  return ticks;
}

"use client";

import { useEffect, useRef, useState } from "react";
import {
  type BandMarkerKind,
  buildPriceBand,
  DEFAULT_LABEL_WIDTHS,
  type LabelWidths,
  type PriceBandInput,
} from "@/domain/price-band";

// Design.md §4.21. Hand-built SVG rather than Recharts: the band has no hover,
// no tooltip and no axis interaction, and every position arrives finished from
// buildPriceBand. The SVG has no viewBox, so text keeps its size and the x
// values are percentages of the real width. Colours come from classes, never
// from presentation attributes (coding-standards.md, Charts).

interface PriceBandProps {
  input: PriceBandInput;
  prices: Record<BandMarkerKind, number | null>;
}

// Rough glyph widths at 11px: Instrument Sans for the name, IBM Plex Mono
// (0.6em) for the price, plus the 4px gap between them. An estimate is
// enough — LABEL_GAP absorbs the difference.
const NAME_CHAR_PX = 6.1;
const PRICE_CHAR_PX = 6.6;
const NAME_PRICE_GAP_PX = 4;

const LANE_HEIGHT = 16;
const MARKER_NAMES: Record<BandMarkerKind, string> = {
  stop: "Stop",
  entry: "Entry",
  exit: "Exit",
};

function pct(value: number): string {
  return `${value}%`;
}

function formatAxisR(r: number): string {
  return r === 0 ? "0" : `${r}R`;
}

function labelWidths(
  widthPx: number,
  prices: Record<BandMarkerKind, number | null>,
): LabelWidths {
  const percent = (kind: BandMarkerKind) => {
    const price = prices[kind];
    const px =
      MARKER_NAMES[kind].length * NAME_CHAR_PX +
      (price === null
        ? 0
        : NAME_PRICE_GAP_PX + String(price).length * PRICE_CHAR_PX);
    return (px / widthPx) * 100;
  };
  return {
    stop: percent("stop"),
    entry: percent("entry"),
    exit: percent("exit"),
  };
}

export function PriceBandChart({ input, prices }: PriceBandProps) {
  // Which labels collide depends on the real width, so the band is measured
  // and rebuilt when it changes. Before the first measurement the default
  // widths stand in.
  const ref = useRef<HTMLDivElement>(null);
  const [widthPx, setWidthPx] = useState<number | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidthPx(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const band = buildPriceBand(
    input,
    widthPx ? labelWidths(widthPx, prices) : DEFAULT_LABEL_WIDTHS,
  );
  if (band === null) return null;

  const lanes = Math.max(...band.markers.map((marker) => marker.lane)) + 1;
  const trackY = lanes * LANE_HEIGHT + 12;
  const height = trackY + 26;

  // §1: only the realised stretch and the exit carry gain or loss.
  const toneStroke =
    band.realised?.tone === "loss" ? "stroke-danger-fg" : "stroke-success-fg";
  const toneFill =
    band.realised?.tone === "loss" ? "fill-danger-fg" : "fill-success-fg";

  const summary = band.markers
    .map(
      (marker) =>
        `${MARKER_NAMES[marker.kind]} ${prices[marker.kind] ?? ""} at ${formatAxisR(marker.r)}`,
    )
    .join(", ");

  return (
    <div ref={ref}>
      <svg
        width="100%"
        height={height}
        role="img"
        aria-label={summary}
        className="block overflow-visible font-mono"
      >
        {/* Track */}
        <line
          x1="0%"
          x2="100%"
          y1={trackY}
          y2={trackY}
          strokeWidth={1}
          className="stroke-fg-subtle/40"
        />

        {/* Hypothetical spans stay neutral (§4.17). */}
        {band.mae && (
          <rect
            x={pct(band.mae.from)}
            width={pct(band.mae.to - band.mae.from)}
            y={trackY - 5}
            height={10}
            rx={2}
            className="fill-fg-subtle/25"
          />
        )}
        {band.mfe && (
          <rect
            x={pct(band.mfe.from)}
            width={pct(band.mfe.to - band.mfe.from)}
            y={trackY - 5}
            height={10}
            rx={2}
            className="fill-fg-muted/25"
          />
        )}
        {band.postExit && (
          <line
            x1={pct(band.postExit.from)}
            x2={pct(band.postExit.to)}
            y1={trackY}
            y2={trackY}
            strokeWidth={2}
            strokeDasharray="3 4"
            className="stroke-fg-muted"
          />
        )}
        {band.realised && (
          <rect
            x={pct(band.realised.from)}
            width={pct(band.realised.to - band.realised.from)}
            y={trackY - 2}
            height={4}
            className={toneFill}
          />
        )}

        {/* Whole-R ticks under the track */}
        {band.ticks.map((tick) => (
          <g key={tick.r}>
            <line
              x1={pct(tick.position)}
              x2={pct(tick.position)}
              y1={trackY + 6}
              y2={trackY + 9}
              strokeWidth={1}
              className="stroke-fg-subtle"
            />
            <text
              x={pct(tick.position)}
              y={trackY + 21}
              textAnchor="middle"
              className="fill-fg-subtle text-[10px] tabular-nums"
            >
              {formatAxisR(tick.r)}
            </text>
          </g>
        ))}

        {/* Markers and their labels */}
        {band.markers.map((marker) => {
          const labelY = trackY - 12 - marker.lane * LANE_HEIGHT;
          const stroke =
            marker.kind === "exit"
              ? toneStroke
              : marker.kind === "entry"
                ? "stroke-fg"
                : "stroke-fg-muted";
          return (
            <g key={marker.kind}>
              <line
                x1={pct(marker.position)}
                x2={pct(marker.position)}
                y1={trackY - 8}
                y2={trackY + 8}
                strokeWidth={2}
                className={stroke}
              />
              <text
                x={pct(marker.position)}
                y={labelY}
                textAnchor={marker.anchor}
                className="text-[11px] tabular-nums"
              >
                <tspan className="fill-fg-subtle font-sans">
                  {MARKER_NAMES[marker.kind]}
                </tspan>
                {prices[marker.kind] !== null && (
                  <tspan className="fill-fg font-semibold" dx={4}>
                    {prices[marker.kind]}
                  </tspan>
                )}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

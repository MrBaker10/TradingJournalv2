import type { ZeroLineBar } from "@/domain/analytics";

/**
 * A horizontal bar from a zero line, as hand-built SVG without a `viewBox`:
 * positions are percentages, so nothing needs an inline style and the bar
 * stretches with its row (coding-standards.md, Charts). `tone` is the fill
 * class; the track and the zero line stay quiet.
 */
export function ThinBar({
  bar,
  zero = 0,
  tone,
  className = "h-1",
}: {
  bar: ZeroLineBar | null;
  /** The zero line in percent; drawn only when it is not at the start. */
  zero?: number;
  tone: string;
  className?: string;
}) {
  return (
    <svg className={`block w-full ${className}`} aria-hidden="true">
      <rect width="100%" height="100%" rx="1" className="fill-muted/50" />
      {bar && bar.length > 0 && (
        <rect
          x={`${bar.start}%`}
          width={`${bar.length}%`}
          height="100%"
          rx="1"
          className={tone}
        />
      )}
      {zero > 0 && (
        <rect
          x={`${zero}%`}
          width="1"
          height="100%"
          className="fill-muted-foreground/50"
        />
      )}
    </svg>
  );
}

/**
 * The fill of a bar: money and R in their sign colour, counts and shares
 * neutral (Design.md §1). Zero is neutral too; nothing is a winner's colour.
 */
export function barFill(value: number | null, signed: boolean): string {
  if (!signed || value === null || value === 0) return "fill-foreground/35";
  return value > 0 ? "fill-positive/70" : "fill-negative/70";
}

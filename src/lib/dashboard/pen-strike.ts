/** Pen speed in px per second: every line takes as long as its width needs. */
export const PEN_SPEED = 900;
/** A line shorter than this would flash rather than be drawn. */
const PEN_MIN_SECONDS = 0.08;
/** Where the stroke crosses a line box, as a share of its height from the top. */
const STRIKE_HEIGHT = 0.56;

/** A rendered text line as `Range.getClientRects()` reports it. */
export interface LineBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface StrikeLine {
  /** Relative to the origin, in px. */
  left: number;
  top: number;
  width: number;
  /** Seconds after the tick: the line starts where the previous one ended. */
  delay: number;
  duration: number;
}

/**
 * A pen stroke through a checklist step: one line per rendered text line,
 * drawn left to right at a constant speed, the next starting when the
 * previous one ends, like crossing out by hand. The boxes are measured from
 * the DOM, so wrapping is whatever the layout made of the text.
 */
export function strikeLines(
  boxes: LineBox[],
  origin: { left: number; top: number },
): StrikeLine[] {
  const lines: StrikeLine[] = [];
  let delay = 0;
  for (const box of boxes) {
    // A wrap can report an empty box at the end of the previous line.
    if (box.width < 1) continue;
    const duration = Math.max(box.width / PEN_SPEED, PEN_MIN_SECONDS);
    lines.push({
      left: box.left - origin.left,
      top:
        Math.round((box.top - origin.top + box.height * STRIKE_HEIGHT) * 10) /
        10,
      width: box.width,
      delay,
      duration,
    });
    delay += duration;
  }
  return lines;
}

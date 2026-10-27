export interface RingPoint {
  x: number;
  y: number;
}

/**
 * Rounded to four decimals: server and browser can disagree on the last float
 * digit of a sine, and the SVG fallback of the streak orb then fails to
 * hydrate. `|| 0` turns a rounded -0 into 0.
 */
function round(value: number): number {
  return Math.round(value * 1e4) / 1e4 || 0;
}

/**
 * `count` evenly spaced points on the unit circle, the first at the top and
 * the rest clockwise in screen coordinates (y grows downwards). One point per
 * streak day on the streak orb.
 */
export function ringPositions(count: number): RingPoint[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    return { x: round(Math.cos(angle)), y: round(Math.sin(angle)) };
  });
}

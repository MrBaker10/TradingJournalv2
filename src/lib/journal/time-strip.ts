const MINUTES_PER_DAY = 24 * 60;
/** Room on either side of the day's first and last entry. */
const PADDING_MINUTES = 60;
/** The narrowest window, so a single entry does not fill the strip. */
const MIN_WINDOW_MINUTES = 4 * 60;
/** The most hour labels the strip prints; more overlap at phone width. */
const MAX_LABELS = 7;

export interface TimeStripHour {
  hour: number;
  /** Percent from the strip's left edge. */
  left: number;
  /** Whether the hour is printed; the others are bare ticks. */
  label: boolean;
}

export interface TimeStrip {
  hours: TimeStripHour[];
  /** Percent from the strip's left edge, one per entry time, in input order. */
  positions: number[];
}

/** Minutes since midnight of a stored chart-clock time ("HH:MM:SS"). */
function minutesOf(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}

/** Two decimals, so server and browser print the same `left`. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Where a day's entries sit on the journal's time strip (Design.md §3.3).
 *
 * The times are the stored chart-clock times; no time zone applies to them.
 * The window spans the day's entries plus an hour each side, widened around
 * its middle to at least four hours, and never leaves the day.
 */
export function timeStrip(entryTimes: string[]): TimeStrip {
  const minutes = entryTimes.map(minutesOf);
  let start = Math.min(...minutes) - PADDING_MINUTES;
  let end = Math.max(...minutes) + PADDING_MINUTES;
  if (end - start < MIN_WINDOW_MINUTES) {
    const middle = (start + end) / 2;
    start = middle - MIN_WINDOW_MINUTES / 2;
    end = middle + MIN_WINDOW_MINUTES / 2;
  }
  // Slide a window that runs past midnight back into the day, then cut what
  // still sticks out (a day traded from early morning to late night).
  const shift = Math.max(0, -start) - Math.max(0, end - MINUTES_PER_DAY);
  start = Math.max(0, start + shift);
  end = Math.min(MINUTES_PER_DAY, end + shift);
  const span = end - start;
  const percentOf = (minute: number) => round(((minute - start) / span) * 100);

  const first = Math.ceil(start / 60);
  const count = Math.floor(end / 60) - first + 1;
  // Label every hour, every second, every third, … whichever keeps the count
  // within MAX_LABELS, always on hours divisible by the step.
  const step = Math.ceil(count / MAX_LABELS);
  const hours: TimeStripHour[] = [];
  for (let hour = first; hour * 60 <= end; hour++) {
    hours.push({
      hour,
      left: percentOf(hour * 60),
      label: hour % step === 0,
    });
  }
  return { hours, positions: minutes.map(percentOf) };
}

"use client";

import { useState } from "react";

/**
 * What a sheet shows, so it keeps showing it while it slides out (Design.md
 * §3.10). Returns the current target while there is one; once it is cleared,
 * the last one with a key of its own. Fresh props for the same key replace
 * the view in place, so a body keyed by `keyOf` keeps its state.
 */
export function useRetainedTarget<T>(
  target: T | null,
  keyOf: (target: T) => string | number,
): T | null {
  const [shown, setShown] = useState(target);
  if (target !== null && (shown === null || keyOf(target) !== keyOf(shown))) {
    setShown(target);
  }
  return target ?? shown;
}

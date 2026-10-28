"use client";

import { useEffect, useRef, useState } from "react";

/** Design-v1.md §4.20: how long the armed state waits for the second click. */
export const CONFIRM_TIMEOUT_MS = 3000;

/**
 * The two-click confirm every destructive button in the app uses instead of
 * `window.confirm` or a modal (Design-v1.md §4.18, §4.20): the first press arms
 * the button, a second press on the same one runs the action, and after
 * `CONFIRM_TIMEOUT_MS` without it the button falls back.
 *
 * Keyed, so a list of buttons (one per screenshot) shares one armed state:
 * pressing another key re-arms on that one instead of confirming.
 */
export function useTwoClickConfirmFor<Key>() {
  const [armed, setArmed] = useState<Key | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );

  function press(key: Key, onConfirm: () => void) {
    if (timeout.current) clearTimeout(timeout.current);
    if (armed !== key) {
      setArmed(key);
      timeout.current = setTimeout(() => setArmed(null), CONFIRM_TIMEOUT_MS);
      return;
    }
    setArmed(null);
    onConfirm();
  }

  return { armed, press };
}

/** `useTwoClickConfirmFor` for a single button. */
export function useTwoClickConfirm() {
  const { armed, press } = useTwoClickConfirmFor<true>();
  return {
    armed: armed === true,
    press: (onConfirm: () => void) => press(true, onConfirm),
  };
}

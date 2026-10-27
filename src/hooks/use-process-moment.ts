"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * True once the page has mounted, a process moment is due and the user has
 * not asked for reduced motion: the signal to mount a pulse or a sweep.
 *
 * Decided after mount, not while rendering. The server cannot know the
 * reduced-motion preference, so a pulse rendered on the server and dropped on
 * the client (or the other way round) fails to hydrate.
 */
export function useProcessMoment(due: boolean): boolean {
  const reduceMotion = useReducedMotion();
  const [play, setPlay] = useState(false);

  useEffect(() => {
    setPlay(due && reduceMotion === false);
  }, [due, reduceMotion]);

  return play;
}

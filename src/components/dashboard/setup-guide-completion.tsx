"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { completeSetupGuide } from "@/actions/setup-guide";
import { useProcessMoment } from "@/hooks/use-process-moment";

/**
 * The finished guide, shown once (Design.md §3.6, Process moment): a band of
 * `process` light sweeps the card, then the card folds away. No confetti,
 * toast or badge. Under reduced motion CSS never paints the card.
 */
export function SetupGuideCompletion({ children }: { children: ReactNode }) {
  const play = useProcessMoment(true);
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(true);
  const [height, setHeight] = useState<number | null>(null);
  const block = useRef<HTMLDivElement>(null);
  const completionWritten = useRef(false);

  // Written once the card has mounted, like the streak tile's
  // markDashboardSeen; a failed write only means the completion shows once
  // more on the next visit.
  useEffect(() => {
    if (completionWritten.current) return;
    completionWritten.current = true;
    void completeSetupGuide();
  }, []);

  useEffect(() => {
    if (reduceMotion) setShown(false);
  }, [reduceMotion]);

  // The fold moves `max-height`, never `height` (coding-standards.md,
  // Motion), so it starts from the card's measured height.
  useEffect(() => {
    if (block.current) setHeight(block.current.scrollHeight);
  }, []);

  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          key="setup-guide-completion"
          ref={block}
          style={height === null ? undefined : { maxHeight: height }}
          // Under reduced motion the card is never painted, so it just goes.
          exit={reduceMotion ? undefined : { maxHeight: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeIn" }}
          className="overflow-hidden motion-reduce:hidden"
        >
          <div className="pb-6">
            <div className="relative overflow-hidden rounded-xl">
              {children}
              {play && (
                // The one gradient a surface may carry (Design.md §6), as on
                // the new badge row: it crosses the card once and is gone.
                <motion.span
                  aria-hidden="true"
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ duration: 1.1, delay: 0.4, ease: "easeInOut" }}
                  onAnimationComplete={() => setShown(false)}
                  className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-process/20 to-transparent"
                />
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

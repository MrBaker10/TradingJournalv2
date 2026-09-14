"use client";

import { motion } from "motion/react";
import { type ReactNode, useEffect, useRef } from "react";
import { markDashboardSeen } from "@/actions/dashboard";

interface StreakBumpProps {
  /** A trade was logged since the dashboard was last opened. */
  active: boolean;
  children: ReactNode;
}

const EASE_SOFT = [0.2, 0.7, 0.3, 1] as const;

// Design.md §4.3 and §6: one bump for a newly logged trade, 620ms, never a
// pulse. It is the reward for logging — not for the trade going well, which
// earns nothing anywhere in this app.
//
// A wrapper rather than a client tile, so the tile itself stays a Server
// Component and only this one of the three ships JavaScript. The children
// arrive already rendered on the server.
//
// Reduced motion needs nothing here: `MotionConfig reducedMotion="user"` at
// the app root drops the scale, and the streak number is readable either way.
export function StreakBump({ active, children }: StreakBumpProps) {
  const marked = useRef(false);

  // Spend the bump once it has played. Deliberately not during render — a GET
  // that writes would spend it even when the response never reached anyone.
  // No revalidate afterwards either: that would re-render the tile mid-bump.
  useEffect(() => {
    if (marked.current || !active) return;
    marked.current = true;
    void markDashboardSeen();
  }, [active]);

  return (
    <motion.div
      className="h-full"
      animate={active ? { scale: [1, 1.14, 1] } : undefined}
      transition={{ duration: 0.62, ease: EASE_SOFT }}
    >
      {children}
    </motion.div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import {
  markDashboardSeen,
  markStreakMilestoneSeen,
} from "@/actions/dashboard";
import { StreakOrb } from "./streak-orb";

interface StreakPanelProps {
  currentStreak: number;
  longestStreak: number;
  /** A trade was logged since the dashboard was last opened. */
  bumpStreak: boolean;
  /** The streak milestone that is due, or null when none is. */
  milestone: number | null;
}

/**
 * The orb and what it stands for. A logged trade since the last visit or a
 * due milestone is a process moment: the orb gathers once and the milestone
 * is named in a line, never a modal or a celebration. Nothing here mentions
 * money; the streak counts logged days.
 *
 * Both are spent after they have rendered, not while the page is built: a GET
 * that writes would spend them even when the response never reached anyone.
 * No revalidate afterwards either, which would re-render the orb mid-moment.
 */
export function StreakPanel({
  currentStreak,
  longestStreak,
  bumpStreak,
  milestone,
}: StreakPanelProps) {
  const spent = useRef(false);

  useEffect(() => {
    if (spent.current) return;
    spent.current = true;
    if (bumpStreak) void markDashboardSeen();
    if (milestone !== null) void markStreakMilestoneSeen();
  }, [bumpStreak, milestone]);

  return (
    <div className="flex flex-col items-center">
      <StreakOrb
        streak={currentStreak}
        longest={longestStreak}
        moment={bumpStreak || milestone !== null}
      />
      <div className="mt-2 text-muted-foreground text-xs">
        Longest {longestStreak} {longestStreak === 1 ? "day" : "days"}
      </div>
      {milestone !== null && (
        <p
          aria-live="polite"
          className="mt-3 flex flex-col gap-0.5 text-center"
        >
          <span className="text-process text-sm">
            {milestone}-day logging streak
          </span>
          <span className="text-muted-foreground text-xs">
            You have shown up {milestone} trading days in a row. That is the
            habit, not the profit.
          </span>
        </p>
      )}
    </div>
  );
}

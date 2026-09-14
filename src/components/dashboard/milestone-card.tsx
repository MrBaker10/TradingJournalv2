"use client";

import { Flame } from "lucide-react";
import { useEffect, useRef } from "react";
import { markStreakMilestoneSeen } from "@/actions/dashboard";

interface MilestoneCardProps {
  /** The milestone that is due, or null when none is. */
  milestone: number | null;
}

// Design.md §6: a middling reward for a middling moment — a card on the page,
// not a modal and not a celebration. Built like
// src/components/progress/unlocked-card.tsx, because it is the same promise
// made twice: proportional, earned, never blocking.
//
// The card marks itself seen after it has rendered, not while the page is
// being built: a GET that writes would spend the milestone even when the
// response never reached anyone.
//
// Nothing here mentions money. The streak counts logged days, and a
// profitable day earns exactly nothing (§6).
export function MilestoneCard({ milestone }: MilestoneCardProps) {
  const marked = useRef(false);

  useEffect(() => {
    if (marked.current || milestone === null) return;
    marked.current = true;
    void markStreakMilestoneSeen();
  }, [milestone]);

  if (milestone === null) return null;

  return (
    <section
      aria-live="polite"
      className="card-surface edge-neon flex items-center gap-4 p-5"
    >
      <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-ctl bg-[image:var(--gradient-info-soft)] text-cyan shadow-[var(--shadow-info-soft)]">
        <Flame className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="cap cap-neon">{milestone}-day logging streak</span>
        <span className="text-fg-subtle text-xs">
          You have shown up {milestone} trading days in a row. That is the
          habit, not the profit.
        </span>
      </div>
    </section>
  );
}

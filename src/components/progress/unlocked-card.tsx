"use client";

import { Award } from "lucide-react";
import { useEffect, useRef } from "react";
import { markBadgesSeen } from "@/actions/badges";

interface UnlockedCardProps {
  /** Titles of the badges earned since the user last looked at this page. */
  titles: string[];
}

// Design.md §6: a middling reward for a middling moment — a card on the page,
// not a modal and not a celebration. Proportional and earned (L07), immediate
// and visible (L08). No confetti, no sound, no money anywhere near it.
//
// The card marks itself seen after it has rendered, not while the page is
// being built: a GET that writes would mark the badge as seen even when the
// response never reached anyone.
export function UnlockedCard({ titles }: UnlockedCardProps) {
  const marked = useRef(false);

  useEffect(() => {
    if (marked.current || titles.length === 0) return;
    marked.current = true;
    void markBadgesSeen();
  }, [titles.length]);

  if (titles.length === 0) return null;

  return (
    <section
      aria-live="polite"
      className="card-surface edge-neon flex items-center gap-4 p-5"
    >
      <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-ctl bg-[image:var(--gradient-info)] text-fg shadow-[var(--shadow-neon)]">
        <Award className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="cap cap-neon">
          {titles.length === 1 ? "Badge unlocked" : "Badges unlocked"}
        </span>
        <span className="font-medium text-fg text-sm">
          {titles.join(" · ")}
        </span>
        <span className="text-[11.5px] text-fg-subtle">
          Earned by journaling. Nothing here is ranked against anyone.
        </span>
      </div>
    </section>
  );
}

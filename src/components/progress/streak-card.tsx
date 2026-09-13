"use client";

import { ChevronDown, Info } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { StreakResult } from "@/domain/streak";
import { formatDayLabel } from "@/lib/time";

interface StreakCardProps {
  streak: StreakResult;
}

// Wording taken from project-overview.md "The Rules" and
// project-structure.md "Rules the code must honour" — the same sentences the
// code is written against, not a second paraphrase that could drift from it.
const STREAK_RULES: { title: string; body: string }[] = [
  {
    title: "A logged day is a trading day with at least one entry",
    body: "Taken or missed — a missed setup counts exactly as much as a trade.",
  },
  {
    title: "Log within 48 hours or it never builds a streak",
    body: "A later backfill still counts for every other stat and for the volume badges. It just cannot manufacture a day you never journaled in time.",
  },
  {
    title: "Saturdays are skipped",
    body: "They are not trading days, so they never break anything.",
  },
  {
    title: "Sunday belongs to the new week",
    body: "Globex opens Sunday evening, so a Sunday-dated trade lands on Monday.",
  },
  {
    title: "One grace day per calendar month",
    body: "The first missed weekday in a month is forgiven. A second one in the same month breaks the streak.",
  },
  {
    title: "Today never counts against you",
    body: "The day is not over. Nothing breaks until it is.",
  },
];

export function StreakCard({ streak }: StreakCardProps) {
  const [rulesOpen, setRulesOpen] = useState(false);

  return (
    <section className="flex flex-col gap-3">
      {/* Design.md §4.4: an explanation, not a warning. Amber and calm, no
          red, no exclamation mark, no dismiss — it goes away on its own when
          the grace day is no longer this month's. */}
      {streak.graceDayUsed && streak.graceDayDate !== null && (
        <div className="flex items-center gap-3 rounded-card p-4 shadow-[var(--shadow-notice-amber)]">
          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-xs bg-warning-dim">
            <Info className="h-4 w-4 text-warning" aria-hidden="true" />
          </div>
          <p className="flex-1 text-sm">
            <span className="font-semibold text-fg">
              Grace day used on {formatDayLabel(streak.graceDayDate)}.
            </span>{" "}
            <span className="text-fg-muted">
              Your streak survived that day. The next missed weekday this month
              ends it.
            </span>
          </p>
          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            aria-expanded={rulesOpen}
            aria-controls="streak-rules"
            className="flex h-10 w-10 shrink-0 items-center justify-center text-fg-subtle transition-colors hover:text-fg"
          >
            <span className="sr-only">Show the streak rules</span>
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="card-surface edge-neon flex flex-col gap-4 p-5">
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="cap cap-neon">Logging streak</span>
            <span className="text-glow font-mono text-[26px] font-bold leading-none tabular-nums">
              {streak.current}d
            </span>
          </div>
          <span className="font-mono text-fg-subtle text-xs tabular-nums">
            Longest {streak.longest}d
          </span>
        </div>

        <button
          type="button"
          onClick={() => setRulesOpen((open) => !open)}
          aria-expanded={rulesOpen}
          aria-controls="streak-rules"
          className="flex h-10 items-center gap-1.5 self-start text-fg-muted text-sm transition-colors hover:text-fg"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-300 ${
              rulesOpen ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
          How the streak works
        </button>

        <AnimatePresence initial={false}>
          {rulesOpen && (
            <motion.div
              id="streak-rules"
              key="rules"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.2, 0.7, 0.3, 1] }}
              className="overflow-hidden"
            >
              <ul className="flex flex-col gap-3 border-white/8 border-t pt-4">
                {STREAK_RULES.map((rule) => (
                  <li key={rule.title} className="flex flex-col gap-0.5">
                    <span className="font-medium text-fg text-sm">
                      {rule.title}
                    </span>
                    <span className="text-fg-muted text-xs">{rule.body}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

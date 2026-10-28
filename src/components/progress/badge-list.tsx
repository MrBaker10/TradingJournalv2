"use client";

import { CalendarCheck, Check, Flag, Layers, Lock, Target } from "lucide-react";
import { motion } from "motion/react";
import { Progress } from "@/components/ui/progress";
import type { BadgeCategory } from "@/domain/badges";
import { useProcessMoment } from "@/hooks/use-process-moment";

export interface ProgressBadge {
  key: string;
  category: BadgeCategory;
  title: string;
  description: string;
  /** The day it was earned, already formatted; null while not earned. */
  earnedOn: string | null;
  /** Earned since the user last opened /progress. */
  isNew: boolean;
  /** Towards its threshold; null for a badge that is not a count. */
  progress: { value: number; target: number } | null;
  /** Arrives only once a month is frozen, so the row says so. */
  monthEnd: boolean;
}

const CATEGORY_ICON = {
  "Getting started": Flag,
  Volume: Layers,
  Streaks: CalendarCheck,
  Craft: Target,
} as const;

/**
 * A badge's progress as a thin process bar with the count beside it. The bar
 * is announced with its count, so the visible figure is not read twice.
 */
export function BadgeProgressBar({
  title,
  value,
  target,
  className = "",
}: {
  title: string;
  value: number;
  target: number;
  className?: string;
}) {
  return (
    <Progress
      value={value}
      max={target}
      aria-label={`${title}: ${value} of ${target}`}
      className={`flex-nowrap items-center gap-2 [&_[data-slot=progress-indicator]]:bg-process/70 ${className}`}
    >
      <span
        aria-hidden="true"
        className="order-last shrink-0 font-mono text-foreground text-xs tabular-nums"
      >
        {value}/{target}
      </span>
    </Progress>
  );
}

function BadgeRow({ badge, sweep }: { badge: ProgressBadge; sweep: boolean }) {
  const Icon = CATEGORY_ICON[badge.category];
  const earned = badge.earnedOn !== null;
  return (
    <li className="relative flex items-center gap-3 overflow-hidden border-b py-2.5 last:border-b-0">
      {sweep && (
        // The one gradient a surface may carry (Design.md §6): a band of
        // light that crosses the new badge once and is gone.
        <motion.span
          aria-hidden="true"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.1, delay: 0.4, ease: "easeInOut" }}
          className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-process/20 to-transparent"
        />
      )}
      <span
        aria-hidden="true"
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          earned
            ? "bg-process/15 text-process"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {earned ? (
          <Icon className="h-4 w-4" />
        ) : (
          <Lock className="h-3.5 w-3.5" />
        )}
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-sm">
          {badge.title}
          {badge.isNew && (
            <span className="ml-2 rounded-full bg-process/15 px-1.5 py-0.5 text-[10px] text-process">
              New
            </span>
          )}
        </span>
        <span className="text-muted-foreground text-xs">
          {badge.description}
          {badge.monthEnd && !earned && " Evaluated once the month is over."}
        </span>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1.5 text-muted-foreground text-xs">
        {earned ? (
          <>
            <Check className="h-3.5 w-3.5 text-process" aria-hidden="true" />
            <span className="font-mono text-foreground tabular-nums">
              {badge.earnedOn}
            </span>
          </>
        ) : badge.progress ? (
          <BadgeProgressBar
            title={badge.title}
            value={badge.progress.value}
            target={badge.progress.target}
            className="w-28 sm:w-36"
          />
        ) : (
          "Not yet"
        )}
      </div>
    </li>
  );
}

/**
 * Every badge as a record, grouped by category, with the day it was earned
 * or the progress towards it (Design.md §3.6). No trophy case and no glow.
 * At a process moment light sweeps the newest badge's row once; under reduced
 * motion the row is simply there.
 */
export function BadgeList({
  badges,
  sweepKey,
}: {
  badges: ProgressBadge[];
  /** The badge a process moment marks, or null when there is none. */
  sweepKey: string | null;
}) {
  const play = useProcessMoment(sweepKey !== null);
  const categories = [...new Set(badges.map((badge) => badge.category))];
  const earnedCount = badges.filter((badge) => badge.earnedOn !== null).length;

  return (
    <section aria-labelledby="badges-heading" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="badges-heading" className="font-semibold text-sm">
          Badges
        </h2>
        <span className="text-muted-foreground text-xs">
          <span className="font-mono text-process tabular-nums">
            {earnedCount}
          </span>{" "}
          of {badges.length} · earned by journaling, never by P&amp;L
        </span>
      </div>
      <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
        {categories.map((category) => (
          <div key={category} className="flex min-w-0 flex-col">
            <h3 className="mb-1 text-[11px] text-muted-foreground uppercase tracking-wider">
              {category}
            </h3>
            <ul>
              {badges
                .filter((badge) => badge.category === category)
                .map((badge) => (
                  <BadgeRow
                    key={badge.key}
                    badge={badge}
                    sweep={play && badge.key === sweepKey}
                  />
                ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

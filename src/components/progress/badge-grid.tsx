import { Flame, Hammer, Layers, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import {
  BADGE_DEFINITIONS,
  type BadgeCategory,
  DEFERRED_BADGE_KEYS,
} from "@/domain/badges";
import { formatDayLabel, todayInTimeZone } from "@/lib/time";

interface BadgeGridProps {
  /** Key → the moment it was written to `user_badges`. */
  earnedAt: Map<string, Date>;
  timeZone: string;
}

const CATEGORY_ORDER: BadgeCategory[] = [
  "Getting started",
  "Volume",
  "Streaks",
  "Craft",
];

const CATEGORY_ICON: Record<BadgeCategory, ReactNode> = {
  "Getting started": <Sparkles className="h-4 w-4" aria-hidden="true" />,
  Volume: <Layers className="h-4 w-4" aria-hidden="true" />,
  Streaks: <Flame className="h-4 w-4" aria-hidden="true" />,
  Craft: <Hammer className="h-4 w-4" aria-hidden="true" />,
};

const DEFERRED_HINT = "Evaluated once the month is over.";

// Design.md §1: badges are process, so an earned one is allowed the gradient
// tile and the neon edge. An open one is matte — never smaller, never pushed
// down the list, because it is the next thing to aim at and not a failure.
export function BadgeGrid({ earnedAt, timeZone }: BadgeGridProps) {
  const earnedCount = BADGE_DEFINITIONS.filter((badge) =>
    earnedAt.has(badge.key),
  ).length;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="cap cap-neon">Badges</h2>
        <span className="font-mono text-fg-subtle text-xs tabular-nums">
          {earnedCount} of {BADGE_DEFINITIONS.length}
        </span>
      </div>

      {CATEGORY_ORDER.map((category) => (
        <div key={category} className="flex flex-col gap-2">
          <span className="cap">{category}</span>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BADGE_DEFINITIONS.filter(
              (badge) => badge.category === category,
            ).map((badge) => {
              const earned = earnedAt.get(badge.key);
              return (
                <li
                  key={badge.key}
                  className={`card-surface flex items-start gap-3 p-4 ${
                    earned ? "edge-neon" : "edge"
                  }`}
                >
                  <div
                    className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-ctl ${
                      earned
                        ? "bg-[image:var(--gradient-info)] text-fg shadow-[var(--shadow-neon)]"
                        : "bg-nav-idle text-fg-subtle"
                    }`}
                  >
                    {CATEGORY_ICON[category]}
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span
                      className={`font-medium text-sm ${
                        earned ? "text-fg" : "text-fg-muted"
                      }`}
                    >
                      {badge.title}
                    </span>
                    <span className="text-fg-subtle text-xs">
                      {badge.description}
                    </span>
                    {earned ? (
                      <span className="cap-neon cap mt-1">
                        Earned{" "}
                        {formatDayLabel(todayInTimeZone(timeZone, earned))}
                      </span>
                    ) : (
                      DEFERRED_BADGE_KEYS.includes(badge.key) && (
                        <span className="mt-1 text-[11.5px] text-warning">
                          {DEFERRED_HINT}
                        </span>
                      )
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

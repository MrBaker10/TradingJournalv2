import { Award, Flame, Target } from "lucide-react";
import type { ReactNode } from "react";
import { StreakBump } from "@/components/dashboard/streak-bump";

interface ProgressTilesProps {
  currentStreak: number;
  longestStreak: number;
  score: number;
  loggedDays: number;
  elapsedTradingDays: number;
  badgesEarned: number;
  badgesTotal: number;
  /** No entry this month yet — Design.md §7 wants an explanation, not a 0. */
  hasEntriesThisMonth: boolean;
  /** A trade was logged since the last visit — bump the streak tile once. */
  bumpStreak: boolean;
}

// Design.md §4.3: card-surface edge-neon, cap label, 26px mono value with
// text-glow, a sub-line in fg-subtle, and a 46px tile on the right. These three
// are process, which is exactly why the value is allowed to glow — no money
// value on this page gets the same treatment.
//
// The tile itself uses the calm surface from §4.14, not the full gradient plus
// neon halo it carried before: it is a label for the number, and it was
// outshining it. The icon goes cyan for the same reason — white on the now-dark
// tile would just move the brightest spot instead of removing it.
function Tile({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon: ReactNode;
}) {
  return (
    <div className="card-surface edge-neon flex h-full items-center justify-between gap-3 px-5 py-[18px] transition-[filter] duration-200 ease-[var(--ease-soft)] hover:brightness-110 hover:duration-150">
      <div className="flex flex-col gap-0.5">
        <span className="cap">{label}</span>
        <span className="text-glow font-mono text-[26px] font-bold tabular-nums leading-none">
          {value}
        </span>
        <span className="text-[11.5px] text-fg-subtle">{sub}</span>
      </div>
      <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-ctl bg-[image:var(--gradient-info-soft)] text-cyan shadow-[var(--shadow-info-soft)]">
        {icon}
      </div>
    </div>
  );
}

export function ProgressTiles({
  currentStreak,
  longestStreak,
  score,
  loggedDays,
  elapsedTradingDays,
  badgesEarned,
  badgesTotal,
  hasEntriesThisMonth,
  bumpStreak,
}: ProgressTilesProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Only this tile is wrapped, so only this tile ships JavaScript. */}
      <StreakBump active={bumpStreak}>
        <Tile
          label="Logging streak"
          value={`${currentStreak}d`}
          sub={`Longest ${longestStreak}d`}
          icon={<Flame className="h-5 w-5" aria-hidden="true" />}
        />
      </StreakBump>
      <Tile
        label="Consistency"
        value={String(score)}
        sub={
          hasEntriesThisMonth
            ? `of 100 · ${loggedDays}/${elapsedTradingDays} days`
            : "Log a trade — taken or missed — and this month's score starts building."
        }
        icon={<Target className="h-5 w-5" aria-hidden="true" />}
      />
      <Tile
        label="Badges"
        value={String(badgesEarned)}
        sub={`of ${badgesTotal}`}
        icon={<Award className="h-5 w-5" aria-hidden="true" />}
      />
    </div>
  );
}

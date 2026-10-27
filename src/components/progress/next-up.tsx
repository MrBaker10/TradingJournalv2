import { BadgeProgressBar, type ProgressBadge } from "./badge-list";

/**
 * The three unearned badges closest to their threshold (Design.md §3.6). Which
 * three is `nextUpBadges`' rule; this only draws them.
 */
export function NextUp({ badges }: { badges: ProgressBadge[] }) {
  if (badges.length === 0) return null;
  return (
    <section aria-labelledby="next-up-heading" className="flex flex-col gap-2">
      <h2 id="next-up-heading" className="text-muted-foreground text-xs">
        Next up
      </h2>
      <ul className="grid gap-2 sm:grid-cols-3">
        {badges.map((badge) => (
          <li
            key={badge.key}
            className="flex flex-col gap-2 rounded-lg border bg-card p-3"
          >
            <span className="text-sm">{badge.title}</span>
            {badge.progress && (
              <BadgeProgressBar
                title={badge.title}
                value={badge.progress.value}
                target={badge.progress.target}
              />
            )}
            <span className="text-muted-foreground text-xs">
              {badge.description}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

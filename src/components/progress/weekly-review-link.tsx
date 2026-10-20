import { ChevronRight } from "lucide-react";
import Link from "next/link";

// The entry to the weekly review from Progress (Design.md §4.26). It lives
// here rather than in the navigation because it is a habit like the streak
// and score next to it (spec, Further Notes). The shape is the quick-access
// card of §4.10: cap title, one muted line, lift on hover.
export function WeeklyReviewLink({ reviewed }: { reviewed: boolean }) {
  return (
    <Link
      href="/progress/weekly-review"
      className="card-surface edge-neon group flex items-center justify-between gap-4 p-5 transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="flex flex-col gap-1">
        <h2 className="cap cap-neon">Weekly review</h2>
        <p className="text-fg-muted text-sm">
          {reviewed
            ? "Reviewed this week. Open it to add a thought."
            : "Step back once a week: what worked, what did not, what to focus on."}
        </p>
      </div>
      <ChevronRight
        className="h-5 w-5 shrink-0 text-fg-subtle transition-colors group-hover:text-fg"
        aria-hidden="true"
      />
    </Link>
  );
}

import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";
import {
  activeJournalFilterCount,
  buildJournalHref,
  CLEARED_JOURNAL_FILTERS,
  type JournalSearchParams,
} from "@/lib/journal/href";

const ACTION_CLASS = buttonVariants({
  variant: "outline",
  className: "h-10",
});

interface JournalEmptyProps {
  searchParams: JournalSearchParams;
}

// Design.md §1 (empty states teach): two calm empty states, told apart by the
// same "filter active" rule as the filter menu's Clear — nothing logged yet,
// or nothing matching. No illustration, no accent colour.
export function JournalEmpty({ searchParams }: JournalEmptyProps) {
  const filtered = activeJournalFilterCount(searchParams) > 0;

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed px-4 py-12 text-center">
      <p className="max-w-sm text-muted-foreground text-sm">
        {filtered
          ? "No entries match these filters. A missed setup counts the same as a trade."
          : "No entries yet. Log a trade or a missed setup; both count as an entry."}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {filtered ? (
          <Link
            href={buildJournalHref(searchParams, CLEARED_JOURNAL_FILTERS)}
            className={ACTION_CLASS}
          >
            Clear filters
          </Link>
        ) : (
          <>
            <Link href="/journal/new" className={ACTION_CLASS}>
              Log trade
            </Link>
            <Link href="/journal/import" className={ACTION_CLASS}>
              Import
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

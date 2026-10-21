import Link from "next/link";
import {
  activeJournalFilterCount,
  buildJournalHref,
  CLEARED_JOURNAL_FILTERS,
  type JournalSearchParams,
} from "@/lib/journal/href";
import { QUIET_ACTION_CLASS } from "./quiet-action-class";

interface JournalEmptyProps {
  searchParams: JournalSearchParams;
}

// Design.md §4.27: two calm empty states, told apart by the same "filter
// active" rule as the filter bar's Clear — nothing logged yet, or nothing
// matching. No illustration, no accent colour: an empty list is not news.
export function JournalEmpty({ searchParams }: JournalEmptyProps) {
  const filtered = activeJournalFilterCount(searchParams) > 0;

  return (
    <div className="card-surface edge flex flex-col items-center gap-4 px-4 py-10 text-center">
      <p className="text-fg-muted text-sm">
        {filtered ? "No entries match these filters." : "No entries yet."}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {filtered ? (
          <Link
            href={buildJournalHref(searchParams, CLEARED_JOURNAL_FILTERS)}
            className={QUIET_ACTION_CLASS}
          >
            Clear filters
          </Link>
        ) : (
          <>
            <Link href="/journal/new" className={QUIET_ACTION_CLASS}>
              New trade
            </Link>
            <Link href="/journal/import" className={QUIET_ACTION_CLASS}>
              Import
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

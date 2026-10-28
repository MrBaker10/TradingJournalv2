import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { buildJournalHref, type JournalSearchParams } from "@/lib/journal/href";

const LINK_CLASS = buttonVariants({
  variant: "ghost",
  className: "h-10 min-w-10 lg:h-8 lg:min-w-8",
});

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  totalCount: number;
  searchParams: JournalSearchParams;
}

// Windowed page numbers (first, last, current ± 1) instead of one link per
// page — a journal can grow into hundreds of pages over time.
function getPageWindow(
  current: number,
  total: number,
): (number | "ellipsis")[] {
  const keep = new Set(
    [1, total, current - 1, current, current + 1].filter(
      (n) => n >= 1 && n <= total,
    ),
  );
  const sorted = [...keep].sort((a, b) => a - b);
  const result: (number | "ellipsis")[] = [];
  let previous = 0;
  for (const n of sorted) {
    if (previous && n - previous > 1) result.push("ellipsis");
    result.push(n);
    previous = n;
  }
  return result;
}

function PageLink({
  label,
  page,
  disabled,
  searchParams,
}: {
  label: string;
  page: number;
  disabled: boolean;
  searchParams: JournalSearchParams;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={`${LINK_CLASS} pointer-events-none opacity-50`}
      >
        {label}
      </span>
    );
  }
  return (
    <Link
      href={buildJournalHref(searchParams, {
        page: page === 1 ? undefined : String(page),
      })}
      className={LINK_CLASS}
    >
      {label}
    </Link>
  );
}

export function PaginationControls({
  page,
  pageSize,
  totalCount,
  searchParams,
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Journal pages"
      className="flex flex-wrap items-center justify-center gap-1 pt-2"
    >
      <PageLink
        label="Prev"
        page={page - 1}
        disabled={page <= 1}
        searchParams={searchParams}
      />
      {getPageWindow(page, totalPages).map((entry, index) =>
        entry === "ellipsis" ? (
          <span
            key={`ellipsis-${
              // biome-ignore lint/suspicious/noArrayIndexKey: static list, position is the identity
              index
            }`}
            className="px-1 text-muted-foreground text-sm"
          >
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={buildJournalHref(searchParams, {
              page: entry === 1 ? undefined : String(entry),
            })}
            aria-current={entry === page ? "page" : undefined}
            className={`${LINK_CLASS} font-mono tabular-nums ${
              entry === page ? "bg-muted" : ""
            }`}
          >
            {entry}
          </Link>
        ),
      )}
      <PageLink
        label="Next"
        page={page + 1}
        disabled={page >= totalPages}
        searchParams={searchParams}
      />
    </nav>
  );
}

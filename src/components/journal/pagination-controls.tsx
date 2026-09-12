import Link from "next/link";
import { buildJournalHref, type JournalSearchParams } from "@/lib/journal/href";

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
      <span className="rounded-xs px-2.5 py-1.5 text-fg-subtle text-sm opacity-40">
        {label}
      </span>
    );
  }
  return (
    <Link
      href={buildJournalHref(searchParams, {
        page: page === 1 ? undefined : String(page),
      })}
      className="rounded-xs px-2.5 py-1.5 text-fg-muted text-sm transition-colors hover:text-fg"
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
    <nav className="flex items-center justify-center gap-1.5 pt-2">
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
            className="px-1 text-fg-subtle text-sm"
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
            className={`flex h-8 w-8 items-center justify-center rounded-xs text-sm transition-colors ${
              entry === page
                ? "bg-cyan-dim text-cyan"
                : "text-fg-muted hover:text-fg"
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

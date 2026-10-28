import Link from "next/link";
import { redirect } from "next/navigation";
import { EntryCard } from "@/components/journal/entry-card";
import { HiddenPracticeBanner } from "@/components/journal/hidden-practice-banner";
import { JournalDay } from "@/components/journal/journal-day";
import { JournalDetailSheet } from "@/components/journal/journal-detail-sheet";
import { JournalEmpty } from "@/components/journal/journal-empty";
import { JournalFilterMenu } from "@/components/journal/journal-filter-menu";
import { PaginationControls } from "@/components/journal/pagination-controls";
import { buttonVariants } from "@/components/ui/button";
import { listInstruments } from "@/db/queries/instruments";
import { withDisplayCurrency } from "@/db/queries/scope";
import {
  JOURNAL_PAGE_SIZE,
  type JournalSortBy,
  listJournalTrades,
} from "@/db/queries/trades";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { journalLayout } from "@/lib/journal/day-groups";
import { buildJournalHref, type JournalSearchParams } from "@/lib/journal/href";
import { firstValue } from "@/lib/search-params";
import { rangeForPreset, todayInTimeZone } from "@/lib/time";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface JournalPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseDate(value: string | undefined): string | undefined {
  return value && DATE_PATTERN.test(value) ? value : undefined;
}

export default async function JournalPage({ searchParams }: JournalPageProps) {
  const rawParams = await searchParams;
  const current: JournalSearchParams = {
    range: firstValue(rawParams.range),
    from: firstValue(rawParams.from),
    to: firstValue(rawParams.to),
    instrument: firstValue(rawParams.instrument),
    sort: firstValue(rawParams.sort),
    dir: firstValue(rawParams.dir),
    page: firstValue(rawParams.page),
  };

  const page = Math.max(1, Number.parseInt(current.page ?? "1", 10) || 1);
  const sortBy: JournalSortBy = current.sort === "r" ? "r" : "date";
  const sortDir = current.dir === "asc" ? "asc" : "desc";
  const instrumentId = current.instrument
    ? Number.parseInt(current.instrument, 10) || undefined
    : undefined;

  const user = await getCurrentUser();
  // Typed dates win over a preset, as on Analytics; a preset is resolved
  // against the user's own "today" — a calendar boundary is the user's zone
  // (coding-standards.md, Time).
  const typedFrom = parseDate(current.from);
  const typedTo = parseDate(current.to);
  const preset =
    typedFrom || typedTo
      ? null
      : rangeForPreset(current.range, todayInTimeZone(user.timezone));
  const dateFrom = typedFrom ?? preset?.from;
  const dateTo = typedTo ?? preset?.to;
  // The rows' P&L in the accounts' own currency if they share one, else USD
  // (display-currency).
  const { currency } = await withDisplayCurrency({
    userId: user.id,
    selectedAccountId: user.selectedAccountId,
  });

  const [
    { rows, totalCount, takenCount, missedCount, days, hiddenPracticeCounts },
    instruments,
  ] = await Promise.all([
    listJournalTrades({
      userId: user.id,
      selectedAccountId: user.selectedAccountId,
      currency,
      dateFrom,
      dateTo,
      instrumentId,
      sortBy,
      sortDir,
      page,
    }),
    listInstruments(),
  ]);
  // A page past the last one has no rows although entries exist; the empty
  // state would claim "No entries yet". Back to the first page instead.
  if (rows.length === 0 && page > 1) {
    redirect(buildJournalHref(current, { page: undefined }));
  }
  const layout = journalLayout(rows, days, sortBy);

  // Design.md §3.3: the day log, or a flat list sorted by R, with the wide
  // detail sheet over it. The page head holds counts for every page of these
  // filters and never a money total — a range's total belongs to the
  // dashboard and Analytics. "Log trade" lives in
  // the shell.
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="font-semibold text-xl tracking-tight">Trade Journal</h1>
        <p className="text-muted-foreground text-sm tabular-nums">
          {totalCount} {totalCount === 1 ? "entry" : "entries"} · {takenCount}{" "}
          taken · {missedCount} missed
        </p>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/journal/import"
            className={buttonVariants({
              variant: "outline",
              className: "h-10 lg:h-8",
            })}
          >
            Import
          </Link>
          <JournalFilterMenu
            instruments={instruments.map((instrument) => ({
              id: instrument.id,
              symbol: instrument.symbol,
              assetClass: instrument.assetClass,
            }))}
          />
        </div>
      </div>

      <HiddenPracticeBanner hiddenCounts={hiddenPracticeCounts} />

      {rows.length === 0 ? (
        <JournalEmpty searchParams={current} />
      ) : (
        <JournalDetailSheet currency={currency}>
          {layout.kind === "days" ? (
            <div className="flex flex-col gap-10">
              {layout.days.map((day) => (
                <JournalDay key={day.date} day={day} currency={currency} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {layout.rows.map((trade) => (
                <EntryCard
                  key={trade.id}
                  trade={trade}
                  currency={currency}
                  lead="date"
                />
              ))}
            </div>
          )}
        </JournalDetailSheet>
      )}

      <PaginationControls
        page={page}
        pageSize={JOURNAL_PAGE_SIZE}
        totalCount={totalCount}
        searchParams={current}
      />
    </div>
  );
}

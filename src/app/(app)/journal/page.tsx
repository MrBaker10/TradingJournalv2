import Link from "next/link";
import { HiddenPracticeBanner } from "@/components/journal/hidden-practice-banner";
import { JournalDay } from "@/components/journal/journal-day";
import { JournalFilters } from "@/components/journal/journal-filters";
import { PaginationControls } from "@/components/journal/pagination-controls";
import { TradeRow } from "@/components/journal/trade-row";
import { listInstruments } from "@/db/queries/instruments";
import { withDisplayCurrency } from "@/db/queries/scope";
import {
  JOURNAL_PAGE_SIZE,
  type JournalSortBy,
  listJournalTrades,
} from "@/db/queries/trades";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { journalLayout } from "@/lib/journal/day-groups";
import type { JournalSearchParams } from "@/lib/journal/href";
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
  const layout = journalLayout(rows, days, sortBy);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="page-title">Trade Journal</h1>
        <div className="flex items-center gap-2">
          {/* The quiet process surface of Design.md §4.14: a secondary action
              that stands next to the primary one without competing with it. */}
          <Link
            href="/journal/import"
            className="flex h-10 items-center whitespace-nowrap rounded-ctl bg-[image:var(--gradient-info-soft)] px-4 font-medium text-fg text-sm shadow-[var(--shadow-info-soft)]"
          >
            Import
          </Link>
          <Link
            href="/journal/new"
            className="flex h-10 items-center whitespace-nowrap rounded-ctl bg-[image:var(--gradient-info)] px-4 font-medium text-fg text-sm shadow-[var(--shadow-button-primary)]"
          >
            New trade
          </Link>
        </div>
      </div>

      <JournalFilters
        instruments={instruments.map((instrument) => ({
          id: instrument.id,
          symbol: instrument.symbol,
          assetClass: instrument.assetClass,
        }))}
      />

      {/* Design.md §4.27: counts for every page of these filters, no money —
          a range's total belongs to the dashboard and Analytics. */}
      <p className="text-fg-muted text-sm">
        {totalCount} {totalCount === 1 ? "entry" : "entries"} · {takenCount}{" "}
        taken · {missedCount} missed
      </p>

      <HiddenPracticeBanner hiddenCounts={hiddenPracticeCounts} />

      {rows.length === 0 ? (
        <p className="py-10 text-center text-fg-subtle text-sm">
          No trades match these filters yet.
        </p>
      ) : layout.kind === "days" ? (
        <div className="flex flex-col gap-[10px]">
          {layout.days.map((day) => (
            <JournalDay key={day.date} day={day} currency={currency} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {layout.rows.map((trade) => (
            <TradeRow key={trade.id} trade={trade} currency={currency} />
          ))}
        </div>
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

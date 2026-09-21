import Link from "next/link";
import { HiddenPracticeBanner } from "@/components/journal/hidden-practice-banner";
import { JournalFilters } from "@/components/journal/journal-filters";
import { PaginationControls } from "@/components/journal/pagination-controls";
import { TradeRow } from "@/components/journal/trade-row";
import { listInstruments } from "@/db/queries/instruments";
import {
  JOURNAL_PAGE_SIZE,
  type JournalSortBy,
  listJournalTrades,
} from "@/db/queries/trades";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import type { JournalSearchParams } from "@/lib/journal/href";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface JournalPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseDate(value: string | undefined): string | undefined {
  return value && DATE_PATTERN.test(value) ? value : undefined;
}

export default async function JournalPage({ searchParams }: JournalPageProps) {
  const rawParams = await searchParams;
  const current: JournalSearchParams = {
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
  const dateFrom = parseDate(current.from);
  const dateTo = parseDate(current.to);
  const instrumentId = current.instrument
    ? Number.parseInt(current.instrument, 10) || undefined
    : undefined;

  const user = await getCurrentUser();

  const [{ rows, totalCount, hiddenPracticeCounts }, instruments] =
    await Promise.all([
      listJournalTrades({
        userId: user.id,
        selectedAccountId: user.selectedAccountId,
        dateFrom,
        dateTo,
        instrumentId,
        sortBy,
        sortDir,
        page,
      }),
      listInstruments(),
    ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="page-title">Trade Journal</h1>
        <div className="flex items-center gap-2">
          {/* The quiet process surface of Design.md §4.14: a secondary action
              that stands next to the primary one without competing with it. */}
          <Link
            href="/journal/import"
            className="flex h-10 items-center rounded-ctl bg-[image:var(--gradient-info-soft)] px-4 font-medium text-fg text-sm shadow-[var(--shadow-info-soft)]"
          >
            Import
          </Link>
          <Link
            href="/journal/new"
            className="flex h-10 items-center rounded-ctl bg-[image:var(--gradient-info)] px-4 font-medium text-fg text-sm shadow-[var(--shadow-button-primary)]"
          >
            New trade
          </Link>
        </div>
      </div>

      <JournalFilters
        instruments={instruments.map((instrument) => ({
          id: instrument.id,
          symbol: instrument.symbol,
        }))}
      />

      <HiddenPracticeBanner hiddenCounts={hiddenPracticeCounts} />

      {rows.length === 0 ? (
        <p className="py-10 text-center text-fg-subtle text-sm">
          No trades match these filters yet.
        </p>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {rows.map((trade) => (
            <TradeRow key={trade.id} trade={trade} />
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

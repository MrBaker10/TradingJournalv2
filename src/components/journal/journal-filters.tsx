"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { buildJournalHref, type JournalSearchParams } from "@/lib/journal/href";

interface InstrumentOption {
  id: number;
  symbol: string;
}

interface JournalFiltersProps {
  instruments: InstrumentOption[];
}

type SortValue = "date" | "r";

function SortButton({
  label,
  value,
  current,
  onSelect,
}: {
  label: string;
  value: SortValue;
  current: JournalSearchParams;
  onSelect: (overrides: JournalSearchParams) => void;
}) {
  const activeSort = current.sort ?? "date";
  const activeDir = current.dir ?? "desc";
  const active = activeSort === value;

  function handleClick() {
    onSelect({
      sort: value,
      dir: active && activeDir === "desc" ? "asc" : "desc",
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      className={`rounded-xs border px-2.5 py-1.5 text-sm transition-colors duration-150 ${
        active
          ? "border-cyan/50 bg-cyan-dim text-cyan"
          : "border-white/12 bg-well text-fg-muted hover:border-cyan/35"
      }`}
    >
      {label}
      {active ? (activeDir === "asc" ? " ↑" : " ↓") : ""}
    </button>
  );
}

// Date-range and instrument filters plus the two sortable columns (Date, R),
// all mirrored into searchParams so pagination and sort links can carry them
// forward. Changing a filter resets to page 1.
export function JournalFilters({ instruments }: JournalFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = Object.fromEntries(searchParams.entries());

  function update(overrides: JournalSearchParams) {
    router.push(buildJournalHref(current, { ...overrides, page: undefined }));
  }

  return (
    <div className="card-surface edge flex flex-wrap items-end gap-3 p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="journal-from" className="cap">
          From
        </label>
        <input
          id="journal-from"
          type="date"
          defaultValue={current.from ?? ""}
          onChange={(event) =>
            update({ from: event.target.value || undefined })
          }
          className="h-10 rounded-ctl border border-white/12 bg-well px-3 text-fg text-sm focus:border-cyan focus:shadow-[var(--shadow-focus)] focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="journal-to" className="cap">
          To
        </label>
        <input
          id="journal-to"
          type="date"
          defaultValue={current.to ?? ""}
          onChange={(event) => update({ to: event.target.value || undefined })}
          className="h-10 rounded-ctl border border-white/12 bg-well px-3 text-fg text-sm focus:border-cyan focus:shadow-[var(--shadow-focus)] focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="journal-instrument" className="cap">
          Instrument
        </label>
        <select
          id="journal-instrument"
          defaultValue={current.instrument ?? ""}
          onChange={(event) =>
            update({ instrument: event.target.value || undefined })
          }
          className="h-10 rounded-ctl border border-white/12 bg-well px-3 text-fg text-sm focus:border-cyan focus:shadow-[var(--shadow-focus)] focus:outline-none"
        >
          <option value="">All instruments</option>
          {instruments.map((instrument) => (
            <option key={instrument.id} value={instrument.id}>
              {instrument.symbol}
            </option>
          ))}
        </select>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <span className="cap">Sort</span>
        <SortButton
          label="Date"
          value="date"
          current={current}
          onSelect={update}
        />
        <SortButton label="R" value="r" current={current} onSelect={update} />
      </div>
    </div>
  );
}

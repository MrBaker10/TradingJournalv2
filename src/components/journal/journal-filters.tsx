"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { RangePresetChips } from "@/components/ui/range-preset-chips";
import { groupByAssetClass } from "@/domain/instruments";
import {
  activeJournalFilterCount,
  buildJournalHref,
  JOURNAL_FILTER_KEYS,
  type JournalSearchParams,
} from "@/lib/journal/href";
import { narrowingPreset, type RangePreset } from "@/lib/time";

interface InstrumentOption {
  id: number;
  symbol: string;
  assetClass: string;
}

interface JournalFiltersProps {
  instruments: InstrumentOption[];
}

type SortValue = "date" | "r";

const FIELD_CLASS =
  "h-10 rounded-ctl border border-white/12 bg-well px-3 text-fg text-sm focus:border-cyan focus:shadow-[var(--shadow-focus)] focus:outline-none";

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
      className={`h-10 rounded-xs border px-2.5 text-sm transition-colors duration-150 ${
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

// Design.md §4.27: one slim bar — range presets shared with Analytics, typed
// dates, the instrument, the sort — all mirrored into searchParams so
// pagination and sort links carry them forward. Changing a filter resets to
// page 1. Below `sm` the bar folds behind a "Filters" button.
//
// A preset and typed dates never both apply, as on Analytics: a preset clears
// the dates, a date clears the preset, and the server resolves the preset
// against the user's own "today". The date inputs stay uncontrolled (a
// controlled `type="date"` resets mid-entry); their `key` remounts them when a
// preset or Clear empties them.
export function JournalFilters({ instruments }: JournalFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current: JournalSearchParams = Object.fromEntries(
    searchParams.entries(),
  );
  const [open, setOpen] = useState(false);
  // Grouped like the trade form's select (ftmo-cfd-instruments): 117 symbols
  // in one flat list are not findable.
  const instrumentGroups = useMemo(
    () => groupByAssetClass(instruments),
    [instruments],
  );

  const activeCount = activeJournalFilterCount(current);
  const hasDates = Boolean(current.from || current.to);
  const activePreset: RangePreset | null = hasDates
    ? null
    : (narrowingPreset(current.range) ?? "all");

  function update(overrides: JournalSearchParams) {
    router.push(buildJournalHref(current, { ...overrides, page: undefined }));
  }

  function selectPreset(value: RangePreset) {
    update({
      range: value === "all" ? undefined : value,
      from: undefined,
      to: undefined,
    });
  }

  function setDate(key: "from" | "to", value: string) {
    update({ [key]: value || undefined, range: undefined });
  }

  function clear() {
    update(
      Object.fromEntries(JOURNAL_FILTER_KEYS.map((key) => [key, undefined])),
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="journal-filter-bar"
        className="flex h-10 items-center self-start rounded-ctl border border-white/12 bg-well px-4 text-fg text-sm sm:hidden"
      >
        Filters{activeCount > 0 ? ` · ${activeCount}` : ""}
      </button>

      <div
        id="journal-filter-bar"
        className={`card-surface edge flex-col gap-3 px-3 py-2.5 sm:flex sm:flex-row sm:flex-wrap sm:items-center ${
          open ? "flex" : "hidden"
        }`}
      >
        <RangePresetChips active={activePreset} onSelect={selectPreset} />

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            <span className="cap w-20 sm:w-auto">From</span>
            <input
              key={`from-${current.from ?? ""}`}
              type="date"
              defaultValue={current.from ?? ""}
              onChange={(event) => setDate("from", event.target.value)}
              className={FIELD_CLASS}
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="cap w-20 sm:w-auto">To</span>
            <input
              key={`to-${current.to ?? ""}`}
              type="date"
              defaultValue={current.to ?? ""}
              onChange={(event) => setDate("to", event.target.value)}
              className={FIELD_CLASS}
            />
          </label>
        </div>

        <label className="flex items-center gap-2">
          <span className="cap w-20 sm:w-auto">Instrument</span>
          <select
            key={`instrument-${current.instrument ?? ""}`}
            defaultValue={current.instrument ?? ""}
            onChange={(event) =>
              update({ instrument: event.target.value || undefined })
            }
            className={FIELD_CLASS}
          >
            <option value="">All instruments</option>
            {instrumentGroups.map((group) => (
              <optgroup key={group.assetClass} label={group.label}>
                {group.instruments.map((instrument) => (
                  <option key={instrument.id} value={instrument.id}>
                    {instrument.symbol}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1.5 sm:ml-auto">
          <span className="cap">Sort</span>
          <SortButton
            label="Date"
            value="date"
            current={current}
            onSelect={update}
          />
          <SortButton label="R" value="r" current={current} onSelect={update} />
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clear}
              className="ml-2 h-10 rounded-xs px-2 text-fg-muted text-sm hover:text-fg"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

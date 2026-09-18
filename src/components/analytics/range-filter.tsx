"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  type AnalyticsSearchParams,
  buildAnalyticsHref,
  type RangePreset,
} from "@/lib/analytics/href";

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

function PresetButton({
  label,
  value,
  active,
  onSelect,
}: {
  label: string;
  value: RangePreset;
  active: boolean;
  onSelect: (value: RangePreset) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      aria-pressed={active}
      className={`rounded-xs border px-2.5 py-1.5 text-sm transition-colors duration-150 ${
        active
          ? "border-cyan/50 bg-cyan-dim text-cyan"
          : "border-white/12 bg-well text-fg-muted hover:border-cyan/35"
      }`}
    >
      {label}
    </button>
  );
}

// The date range every section of the page is computed inside, mirrored into
// searchParams so a reload and a shared-by-hand URL show the same figures.
//
// The date inputs are uncontrolled, like the journal's. A controlled
// `type="date"` fires change with an empty value while a date is half-typed,
// and writing that back resets the browser's date editor mid-entry. The `key`
// is what the journal does not need: there, nothing but the field itself ever
// changes the dates — here a preset clears them, and without a remount the
// old date would stay on screen.
//
// Two ways to set it, and they never both apply: a preset writes `range` and
// is resolved against the user's own "today" on the server (a calendar
// boundary belongs in the user's timezone, which the browser here is not
// entitled to decide); typing a date writes `from`/`to` and clears `range`,
// because a custom range and a preset would otherwise disagree.
export function RangeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = Object.fromEntries(
    searchParams.entries(),
  ) as AnalyticsSearchParams;

  const hasCustomRange = Boolean(current.from || current.to);
  const activePreset: RangePreset = hasCustomRange
    ? "all"
    : ((current.range as RangePreset | undefined) ?? "all");

  function selectPreset(value: RangePreset) {
    router.push(
      buildAnalyticsHref(current, {
        range: value === "all" ? undefined : value,
        from: undefined,
        to: undefined,
      }),
    );
  }

  function setDate(key: "from" | "to", value: string) {
    router.push(
      buildAnalyticsHref(current, {
        [key]: value || undefined,
        range: undefined,
      }),
    );
  }

  return (
    <div className="card-surface edge flex flex-wrap items-end gap-3 p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="analytics-from" className="cap">
          From
        </label>
        <input
          id="analytics-from"
          key={current.from ?? ""}
          type="date"
          defaultValue={current.from ?? ""}
          onChange={(event) => setDate("from", event.target.value)}
          className="h-10 rounded-ctl border border-white/12 bg-well px-3 text-fg text-sm focus:border-cyan focus:shadow-[var(--shadow-focus)] focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="analytics-to" className="cap">
          To
        </label>
        <input
          id="analytics-to"
          key={current.to ?? ""}
          type="date"
          defaultValue={current.to ?? ""}
          onChange={(event) => setDate("to", event.target.value)}
          className="h-10 rounded-ctl border border-white/12 bg-well px-3 text-fg text-sm focus:border-cyan focus:shadow-[var(--shadow-focus)] focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((preset) => (
          <PresetButton
            key={preset.value}
            label={preset.label}
            value={preset.value}
            active={!hasCustomRange && activePreset === preset.value}
            onSelect={selectPreset}
          />
        ))}
      </div>
    </div>
  );
}

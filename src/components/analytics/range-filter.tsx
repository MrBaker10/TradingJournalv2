"use client";

import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { RangePresetChips } from "@/components/ui/range-preset-chips";
import {
  type AnalyticsSearchParams,
  buildAnalyticsHref,
} from "@/lib/analytics/href";
import { useRouter } from "@/lib/i18n/navigation";
import { narrowingPreset, type RangePreset } from "@/lib/time";

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
    : (narrowingPreset(current.range) ?? "all");

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
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="analytics-from"
          className="text-muted-foreground text-xs"
        >
          From
        </label>
        <Input
          id="analytics-from"
          key={current.from ?? ""}
          type="date"
          defaultValue={current.from ?? ""}
          onChange={(event) => setDate("from", event.target.value)}
          className="h-10 w-40 lg:h-8"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="analytics-to" className="text-muted-foreground text-xs">
          To
        </label>
        <Input
          id="analytics-to"
          key={current.to ?? ""}
          type="date"
          defaultValue={current.to ?? ""}
          onChange={(event) => setDate("to", event.target.value)}
          className="h-10 w-40 lg:h-8"
        />
      </div>

      <RangePresetChips
        active={hasCustomRange ? null : activePreset}
        onSelect={selectPreset}
      />
    </div>
  );
}

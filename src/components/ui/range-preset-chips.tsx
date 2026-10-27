import { Toggle } from "@/components/ui/toggle";
import type { RangePreset } from "@/lib/time";

export const RANGE_PRESETS: { value: RangePreset; label: string }[] = [
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

interface RangePresetChipsProps {
  /** The active preset, or null while a typed date range applies. */
  active: RangePreset | null;
  onSelect: (value: RangePreset) => void;
}

// The range presets of Analytics and the journal, in one place so both pages
// filter the same way. The server resolves a preset against the user's own
// "today" (`rangeForPreset` in lib/time); this only shows and picks one.
export function RangePresetChips({ active, onSelect }: RangePresetChipsProps) {
  return (
    <fieldset
      aria-label="Range"
      className="flex flex-wrap rounded-lg border p-0.5"
    >
      {RANGE_PRESETS.map((preset) => (
        <Toggle
          key={preset.value}
          pressed={active === preset.value}
          onPressedChange={() => onSelect(preset.value)}
          className="h-10 text-muted-foreground aria-pressed:text-foreground lg:h-8"
        >
          {preset.label}
        </Toggle>
      ))}
    </fieldset>
  );
}

import type { RangePreset } from "@/lib/time";

const PRESETS: { value: RangePreset; label: string }[] = [
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
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((preset) => (
        <button
          key={preset.value}
          type="button"
          onClick={() => onSelect(preset.value)}
          aria-pressed={active === preset.value}
          className={`h-10 rounded-xs border px-2.5 text-sm transition-colors duration-150 ${
            active === preset.value
              ? "border-cyan/50 bg-cyan-dim text-cyan"
              : "border-white/12 bg-well text-fg-muted hover:border-cyan/35"
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

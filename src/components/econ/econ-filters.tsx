"use client";

import { useRouter } from "next/navigation";
import type { EconTab } from "@/domain/econ";
import { buildEconHref, type EconState, toggleCurrency } from "@/lib/econ/href";

interface EconFiltersProps {
  state: EconState;
  /** Every currency with an event in the selected week(s). */
  currencies: string[];
}

const TABS: { value: EconTab; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this", label: "This week" },
  { value: "next", label: "Next week" },
  { value: "both", label: "Both" },
];

// Same shape as src/components/prop-firms/prop-firm-filters.tsx: every change
// goes into searchParams, the server does the filtering.
export function EconFilters({ state, currencies }: EconFiltersProps) {
  const router = useRouter();

  // A selected currency the week no longer has stays on screen, or it could
  // never be deselected.
  const chips = [...new Set([...currencies, ...state.currencies])].sort();

  return (
    <div className="card-surface edge flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1.5">
          <span className="cap">Show</span>
          <div className="flex flex-wrap gap-1.5">
            {TABS.map((tab) => (
              <Chip
                key={tab.value}
                label={tab.label}
                active={state.tab === tab.value}
                onSelect={() =>
                  router.push(buildEconHref(state, { tab: tab.value }))
                }
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="cap">Impact</span>
          <Chip
            label="High impact only"
            active={state.highOnly}
            onSelect={() =>
              router.push(buildEconHref(state, { highOnly: !state.highOnly }))
            }
          />
        </div>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="cap">Currency</span>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((currency) => (
              <Chip
                key={currency}
                label={currency}
                active={state.currencies.includes(currency)}
                onSelect={() =>
                  router.push(
                    buildEconHref(state, {
                      currencies: toggleCurrency(state.currencies, currency),
                    }),
                  )
                }
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Chip({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
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

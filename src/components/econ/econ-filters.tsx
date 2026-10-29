"use client";

import { Toggle } from "@/components/ui/toggle";
import type { EconTab } from "@/domain/econ";
import { buildEconHref, type EconState, toggleCurrency } from "@/lib/econ/href";
import { useRouter } from "@/lib/i18n/navigation";

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

  function go(overrides: Partial<EconState>) {
    router.push(buildEconHref(state, overrides), { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <fieldset
          aria-label="Show"
          className="flex flex-wrap rounded-lg border p-0.5"
        >
          {TABS.map((tab) => (
            <Toggle
              key={tab.value}
              pressed={state.tab === tab.value}
              onPressedChange={() => go({ tab: tab.value })}
              className="h-10 text-muted-foreground aria-pressed:text-foreground lg:h-8"
            >
              {tab.label}
            </Toggle>
          ))}
        </fieldset>
        <Toggle
          variant="outline"
          pressed={state.highOnly}
          onPressedChange={() => go({ highOnly: !state.highOnly })}
          className="h-10 font-normal text-muted-foreground aria-pressed:text-foreground lg:h-8"
        >
          High impact only
        </Toggle>
      </div>

      {chips.length > 0 && (
        <fieldset aria-label="Currency" className="flex flex-wrap gap-1.5">
          {chips.map((currency) => (
            <Toggle
              key={currency}
              variant="outline"
              size="sm"
              pressed={state.currencies.includes(currency)}
              onPressedChange={() =>
                go({
                  currencies: toggleCurrency(state.currencies, currency),
                })
              }
              className="h-10 font-mono font-normal text-muted-foreground aria-pressed:text-foreground lg:h-7"
            >
              {currency}
            </Toggle>
          ))}
        </fieldset>
      )}
    </div>
  );
}

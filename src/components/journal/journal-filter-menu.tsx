"use client";

import { SlidersHorizontal } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RANGE_PRESETS } from "@/components/ui/range-preset-chips";
import { groupByAssetClass } from "@/domain/instruments";
import {
  activeJournalFilterCount,
  buildJournalHref,
  CLEARED_JOURNAL_FILTERS,
  type JournalSearchParams,
} from "@/lib/journal/href";
import { narrowingPreset } from "@/lib/time";

interface InstrumentOption {
  id: number;
  symbol: string;
  assetClass: string;
}

/** A typed `from`/`to` range, which the menu shows but cannot type. */
const CUSTOM_RANGE = "custom";
const ALL_INSTRUMENTS = "all";

const SORTS = [
  { value: "date:desc", label: "By day, newest first" },
  { value: "date:asc", label: "By day, oldest first" },
  { value: "r:desc", label: "By R, best first" },
  { value: "r:asc", label: "By R, worst first" },
];

// Design.md §3.3: one "Filter" menu for range, instrument and sort, writing the
// same search parameters as the filter bar it replaced. Any choice goes back
// to page 1. A preset and typed dates never both apply: a preset clears the
// dates. Typed dates arrive by link (a dashboard calendar day) and show here as
// a custom range until a preset replaces them.
export function JournalFilterMenu({
  instruments,
}: {
  instruments: InstrumentOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current: JournalSearchParams = Object.fromEntries(
    searchParams.entries(),
  );
  // 117 symbols in one flat list are not findable (ftmo-cfd-instruments).
  const instrumentGroups = useMemo(
    () => groupByAssetClass(instruments),
    [instruments],
  );

  const activeCount = activeJournalFilterCount(current);
  const hasDates = Boolean(current.from || current.to);
  const range = hasDates
    ? CUSTOM_RANGE
    : (narrowingPreset(current.range) ?? "all");
  const instrument = instruments.find(
    (item) => String(item.id) === current.instrument,
  );
  const sort = `${current.sort === "r" ? "r" : "date"}:${
    current.dir === "asc" ? "asc" : "desc"
  }`;

  function update(overrides: JournalSearchParams) {
    router.push(buildJournalHref(current, { ...overrides, page: undefined }));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonVariants({
          variant: "outline",
          className: "h-10 lg:h-8",
        })}
      >
        <SlidersHorizontal aria-hidden="true" />
        Filter
        {activeCount > 0 && (
          <span className="rounded-full bg-foreground px-1.5 font-mono text-[11px] text-background tabular-nums">
            {activeCount}
            <span className="sr-only"> active</span>
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Range</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={range}
            onValueChange={(value: string) =>
              update({
                range: value === "all" ? undefined : value,
                from: undefined,
                to: undefined,
              })
            }
          >
            {RANGE_PRESETS.map((preset) => (
              <DropdownMenuRadioItem
                key={preset.value}
                value={preset.value}
                closeOnClick
              >
                {preset.label}
              </DropdownMenuRadioItem>
            ))}
            {hasDates && (
              <DropdownMenuRadioItem value={CUSTOM_RANGE} disabled>
                <span className="font-mono text-xs tabular-nums">
                  {current.from ?? "…"} – {current.to ?? "…"}
                </span>
              </DropdownMenuRadioItem>
            )}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            Instrument
            <span className="ml-auto pl-3 text-muted-foreground">
              {instrument?.symbol ?? "All"}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-80 min-w-44">
            <DropdownMenuRadioGroup
              value={instrument ? String(instrument.id) : ALL_INSTRUMENTS}
              onValueChange={(value: string) =>
                update({
                  instrument: value === ALL_INSTRUMENTS ? undefined : value,
                })
              }
            >
              <DropdownMenuRadioItem value={ALL_INSTRUMENTS} closeOnClick>
                All instruments
              </DropdownMenuRadioItem>
              {instrumentGroups.map((group) => (
                <DropdownMenuGroup key={group.assetClass}>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                  {group.instruments.map((item) => (
                    <DropdownMenuRadioItem
                      key={item.id}
                      value={String(item.id)}
                      closeOnClick
                    >
                      {item.symbol}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuGroup>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Sort</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={sort}
            onValueChange={(value: string) => {
              const [by, dir] = value.split(":");
              update({ sort: by, dir });
            }}
          >
            {SORTS.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                closeOnClick
              >
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        {activeCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => update(CLEARED_JOURNAL_FILTERS)}>
              Clear filters
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

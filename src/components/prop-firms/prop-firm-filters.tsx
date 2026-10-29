"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import type { AccountSizeChip } from "@/db/queries/prop-firms";
import { useRouter } from "@/lib/i18n/navigation";
import {
  buildPropFirmsHref,
  type PropFirmsState,
  toggleTag,
} from "@/lib/prop-firms/href";

interface PropFirmFiltersProps {
  state: PropFirmsState;
  /** The sizes the page filtered by: the URL's, or the preselected one. */
  sizes: number[];
  sizeChips: AccountSizeChip[];
  tags: string[];
  count: number;
}

const SEARCH_DEBOUNCE_MS = 250;

// Size first (Design.md §3.9), then search and tag chips. Every change goes
// into the URL and the server filters, as in the journal's filter menu. The
// search box is debounced because it fires per keystroke.
export function PropFirmFilters({
  state,
  sizes,
  sizeChips,
  tags,
  count,
}: PropFirmFiltersProps) {
  const router = useRouter();
  const [search, setSearch] = useState(state.search);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  });

  useEffect(() => {
    if (search === state.search) return;
    const timer = setTimeout(() => {
      router.push(buildPropFirmsHref(stateRef.current, { search }), {
        scroll: false,
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, state.search, router]);

  function go(overrides: Partial<PropFirmsState>) {
    router.push(buildPropFirmsHref(state, overrides), { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <fieldset
          aria-label="Account size"
          className="flex flex-wrap rounded-lg border p-0.5"
        >
          <Toggle
            pressed={sizes.length === 0}
            onPressedChange={() => go({ sizes: [], anySize: true })}
            className="h-10 text-muted-foreground aria-pressed:text-foreground lg:h-8"
          >
            Any size
          </Toggle>
          {sizeChips.map((chip) => (
            <Toggle
              key={chip.usd}
              pressed={sizes.includes(chip.usd)}
              onPressedChange={() => go({ sizes: [chip.usd], anySize: false })}
              className="h-10 font-mono text-muted-foreground tabular-nums aria-pressed:text-foreground lg:h-8"
            >
              {chip.label}
            </Toggle>
          ))}
        </fieldset>
        <Input
          type="search"
          aria-label="Search"
          defaultValue={state.search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Firm, program or any rule"
          className="h-10 sm:w-64 lg:h-8"
        />
        <span className="ml-auto font-mono text-muted-foreground text-xs tabular-nums">
          {count} {count === 1 ? "program" : "programs"}
        </span>
      </div>

      {tags.length > 0 && (
        <fieldset aria-label="Tags" className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Toggle
              key={tag}
              variant="outline"
              size="sm"
              pressed={state.tags.includes(tag)}
              onPressedChange={() => go({ tags: toggleTag(state.tags, tag) })}
              className="h-10 font-normal text-muted-foreground aria-pressed:text-foreground lg:h-7"
            >
              {tag}
            </Toggle>
          ))}
        </fieldset>
      )}
    </div>
  );
}

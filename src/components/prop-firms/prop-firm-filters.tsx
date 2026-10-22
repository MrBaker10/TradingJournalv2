"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AccountSizeChip } from "@/db/queries/prop-firms";
import {
  buildPropFirmsHref,
  type PropFirmsState,
  toggleSize,
  toggleTag,
} from "@/lib/prop-firms/href";
import { chipClass } from "./chip-class";

interface PropFirmFiltersProps {
  state: PropFirmsState;
  tags: string[];
  sizes: AccountSizeChip[];
}

// Size and tag chips look like the card's size control (chip-class.ts).
function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={chipClass(active)}
    >
      {label}
    </button>
  );
}

const SEARCH_DEBOUNCE_MS = 250;

// Same shape as src/components/journal/journal-filters.tsx: uncontrolled
// inputs, every change mirrored into searchParams, the server does the
// filtering. The search box is debounced because it fires per keystroke.
export function PropFirmFilters({ state, tags, sizes }: PropFirmFiltersProps) {
  const router = useRouter();
  const [search, setSearch] = useState(state.search);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  });

  useEffect(() => {
    if (search === state.search) return;
    const timer = setTimeout(() => {
      router.push(buildPropFirmsHref(stateRef.current, { search }));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, state.search, router]);

  function selectSize(size: number) {
    router.push(
      buildPropFirmsHref(state, { sizes: toggleSize(state.sizes, size) }),
    );
  }

  function selectTag(tag: string) {
    router.push(
      buildPropFirmsHref(state, { tags: toggleTag(state.tags, tag) }),
    );
  }

  return (
    <div className="card-surface edge flex flex-col gap-3 p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="prop-firm-search" className="cap">
          Search
        </label>
        <input
          id="prop-firm-search"
          type="search"
          defaultValue={state.search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Firm, program or any rule"
          className="h-10 rounded-ctl border border-white/12 bg-well px-3 text-fg text-sm placeholder:text-fg-subtle focus:border-cyan focus:shadow-[var(--shadow-focus)] focus:outline-none"
        />
      </div>

      {/* No known size, no group: a chip row nothing could match. */}
      {sizes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="cap">Size</span>
          <div className="flex flex-wrap gap-1.5">
            {sizes.map((size) => (
              <FilterChip
                key={size.usd}
                label={size.label}
                active={state.sizes.includes(size.usd)}
                onClick={() => selectSize(size.usd)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="cap">Filter</span>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <FilterChip
              key={tag}
              label={tag}
              active={state.tags.includes(tag)}
              onClick={() => selectTag(tag)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  buildPropFirmsHref,
  type PropFirmsState,
  toggleTag,
} from "@/lib/prop-firms/href";

interface PropFirmFiltersProps {
  state: PropFirmsState;
  tags: string[];
}

const SEARCH_DEBOUNCE_MS = 250;

// Same shape as src/components/journal/journal-filters.tsx: uncontrolled
// inputs, every change mirrored into searchParams, the server does the
// filtering. The search box is debounced because it fires per keystroke.
export function PropFirmFilters({ state, tags }: PropFirmFiltersProps) {
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

      <div className="flex flex-col gap-1.5">
        <span className="cap">Filter</span>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => {
            const active = state.tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => selectTag(tag)}
                aria-pressed={active}
                className={`rounded-xs border px-2.5 py-1.5 text-sm transition-colors duration-150 ${
                  active
                    ? "border-cyan/50 bg-cyan-dim text-cyan"
                    : "border-white/12 bg-well text-fg-muted hover:border-cyan/35"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

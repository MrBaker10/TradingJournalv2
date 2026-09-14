"use client";

import { ChevronDown, ExternalLink } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import type { PropFirmRow } from "@/db/queries/prop-firms";
import {
  buildPropFirmsHref,
  type PropFirmsState,
  toggleCompare,
} from "@/lib/prop-firms/href";
import { PROGRAM_FIELD_LABELS } from "@/lib/prop-firms/parse";

interface PropFirmCardProps {
  row: PropFirmRow;
  state: PropFirmsState;
  selected: boolean;
  selectionFull: boolean;
}

// A missing rule is stated, not hidden. This is the deliberate opposite of
// DetailField in journal/trade-row.tsx, which renders nothing for a null: on a
// trade an empty field is uninteresting, here the gap is the point
// (project-overview.md, H — the app never invents a rule).
function RuleValue({ value }: { value: string | null }) {
  if (value === null) {
    return <span className="text-fg-subtle text-sm">Not recorded</span>;
  }
  return <span className="text-fg text-sm">{value}</span>;
}

export function PropFirmCard({
  row,
  state,
  selected,
  selectionFull,
}: PropFirmCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const { firm, program } = row;

  function selectForCompare() {
    router.push(
      buildPropFirmsHref(state, {
        compare: toggleCompare(state.compare, program.id),
      }),
    );
  }

  return (
    <div className="card-surface edge relative">
      <div className="flex items-start gap-3 p-4">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <ChevronDown
            className={`mt-0.5 h-4 w-4 shrink-0 text-fg-subtle transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-medium text-fg text-sm">{firm.name}</span>
              <span className="text-fg-muted text-xs">{program.name}</span>
            </div>
            {program.summaryTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {program.summaryTags.map((tag) => (
                  <span
                    key={tag}
                    className="cap rounded-xs bg-well px-1.5 py-0.5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </button>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {/* The label carries the 40px hit area Design.md §8 asks for; the box
              itself stays 16px. -mr-2 pulls the right padding back out so the
              label still lines up with the two lines under it. */}
          <label
            className={`-mr-2 flex h-10 items-center gap-1.5 rounded-ctl px-2 transition-shadow duration-150 focus-within:shadow-[var(--shadow-focus)] ${
              selectionFull && !selected
                ? "cursor-not-allowed"
                : "cursor-pointer"
            }`}
          >
            <input
              type="checkbox"
              checked={selected}
              disabled={selectionFull && !selected}
              onChange={selectForCompare}
              className="h-4 w-4 accent-cyan disabled:opacity-40"
            />
            <span className="cap">Compare</span>
          </label>
          {firm.website ? (
            <a
              href={firm.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-fg-muted text-xs hover:text-fg"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Website
            </a>
          ) : (
            <span className="text-fg-subtle text-xs">Website not recorded</span>
          )}
          <span className="text-fg-subtle text-xs">
            {firm.lastVerifiedAt
              ? `Last verified ${firm.lastVerifiedAt}`
              : "Never verified"}
          </span>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="rules"
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26 }}
            className="overflow-hidden"
          >
            <dl className="grid gap-3 border-white/8 border-t px-4 py-4 sm:grid-cols-2">
              {PROGRAM_FIELD_LABELS.map(([key, label]) => (
                <div
                  key={key}
                  className={`flex flex-col gap-0.5 ${
                    key === "notes" ? "sm:col-span-2" : ""
                  }`}
                >
                  <dt className="cap">{label}</dt>
                  <dd>
                    <RuleValue value={program[key]} />
                  </dd>
                </div>
              ))}
            </dl>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

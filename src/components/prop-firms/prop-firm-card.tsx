"use client";

import { ChevronDown, ExternalLink } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import type { PropFirmRow } from "@/db/queries/prop-firms";
import { type FirmCard, sizeLabels } from "@/lib/prop-firms/cards";
import {
  buildPropFirmsHref,
  MAX_COMPARE,
  type PropFirmsState,
  toggleCompare,
} from "@/lib/prop-firms/href";
import { PROGRAM_FIELD_LABELS } from "@/lib/prop-firms/parse";
import { chipClass } from "./chip-class";

interface PropFirmCardProps {
  card: FirmCard<PropFirmRow>;
  state: PropFirmsState;
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

// Design.md §4.28: one segment per program of the firm that passed the
// filters. Buttons with aria-pressed like every chip in the app, Tab from one
// to the next; the label is the accessible name, the group names the firm.
function SizeControl({
  firmName,
  programs,
  selectedId,
  onSelect,
}: {
  firmName: string;
  programs: PropFirmRow["program"][];
  selectedId: number;
  onSelect: (id: number) => void;
}) {
  const labels = sizeLabels(programs);
  return (
    <fieldset
      aria-label={`Account size, ${firmName}`}
      className="flex min-w-0 flex-wrap gap-1.5"
    >
      {programs.map((program, index) => {
        const active = program.id === selectedId;
        return (
          <button
            key={program.id}
            type="button"
            onClick={() => onSelect(program.id)}
            aria-pressed={active}
            className={chipClass(active)}
          >
            {labels[index]}
          </button>
        );
      })}
    </fieldset>
  );
}

export function PropFirmCard({ card, state }: PropFirmCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  // The size choice is the card's own, not in the URL. Null until the user
  // picks a size, so a filter change moves an untouched card to its new
  // preselection; when the filters take the chosen program away, it falls
  // back to the preselection too.
  const [chosenId, setChosenId] = useState<number | null>(null);
  const panelId = useId();
  const { firm, programs } = card;
  const program =
    programs.find((candidate) => candidate.id === chosenId) ??
    programs.find((candidate) => candidate.id === card.preselectedId) ??
    programs[0];
  const selected = state.compare.includes(program.id);
  const selectionFull = state.compare.length >= MAX_COMPARE;

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
        {/* Size control and tags sit outside the expand button, because
            buttons do not nest; pl-7 lines them up with the firm name. */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            aria-controls={panelId}
            className="flex min-w-0 items-start gap-3 text-left"
          >
            <ChevronDown
              className={`mt-0.5 h-4 w-4 shrink-0 text-fg-subtle transition-transform duration-200 ${
                expanded ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
            <span className="flex flex-wrap items-baseline gap-2">
              <span className="font-medium text-fg text-sm">{firm.name}</span>
              <span className="text-fg-muted text-xs">{program.name}</span>
            </span>
          </button>
          {programs.length > 1 && (
            <div className="pl-7">
              <SizeControl
                firmName={firm.name}
                programs={programs}
                selectedId={program.id}
                onSelect={setChosenId}
              />
            </div>
          )}
          {program.summaryTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pl-7">
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
              className="flex items-center gap-1.5 text-cyan text-xs underline-offset-2 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Website
            </a>
          ) : (
            <span className="text-fg-subtle text-xs">Website not recorded</span>
          )}
          {firm.lastVerifiedAt ? (
            <span className="text-fg-muted text-xs">
              Last verified{" "}
              <span className="font-mono text-fg tabular-nums">
                {firm.lastVerifiedAt}
              </span>
            </span>
          ) : (
            <span className="text-fg-subtle text-xs">Never verified</span>
          )}
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

"use client";

import { useId } from "react";
import type { PropFirmRow } from "@/db/queries/prop-firms";
import type { PropFirmsState } from "@/lib/prop-firms/href";
import { CompareToggle } from "./compare-toggle";
import { KeyFigures, LinkedBadge, Tags } from "./program-parts";

/**
 * One program of the catalogue (Design.md §3.9). The firm name and figures
 * are the button that opens the firm sheet; the compare toggle is its
 * sibling, because a button inside a button is invalid HTML and breaks
 * hydration.
 */
export function PropFirmCard({
  row,
  accountNames,
  state,
  onOpen,
}: {
  row: PropFirmRow;
  accountNames: string[];
  state: PropFirmsState;
  onOpen: (programId: number) => void;
}) {
  const nameId = useId();
  const figuresId = useId();
  const { firm, program } = row;

  return (
    <div className="flex flex-col rounded-lg border bg-card text-card-foreground transition-[translate,border-color] duration-150 hover:-translate-y-px hover:border-ring/40">
      <button
        type="button"
        onClick={() => onOpen(program.id)}
        aria-labelledby={nameId}
        aria-describedby={figuresId}
        className="flex flex-1 flex-col gap-3 rounded-t-lg p-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span id={nameId} className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{firm.name}</span>
          <span className="truncate text-muted-foreground text-xs">
            {program.name}
          </span>
        </span>
        <KeyFigures program={program} id={figuresId} />
      </button>
      <div className="mx-4 flex items-end justify-between gap-2 border-t py-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <LinkedBadge names={accountNames} />
          <Tags tags={program.summaryTags} />
        </div>
        <CompareToggle
          state={state}
          programId={program.id}
          label={`${firm.name} · ${program.name}`}
        />
      </div>
    </div>
  );
}

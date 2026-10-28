"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Toggle } from "@/components/ui/toggle";
import type { PropFirmRow } from "@/db/queries/prop-firms";
import { useRetainedTarget } from "@/hooks/use-retained-target";
import type { PropFirmsState } from "@/lib/prop-firms/href";
import { PROGRAM_FIELD_LABELS } from "@/lib/prop-firms/parse";
import { CompareToggle } from "./compare-toggle";
import {
  FirmMeta,
  KeyFigures,
  LinkedBadge,
  NUMERIC_FIELDS,
  RuleValue,
  Tags,
} from "./program-parts";

/**
 * The firm page of Design.md §3.9 (medium sheet): website, verified date, the
 * firm's program switcher in the head, key figures, tags and all 18 rules in
 * one column. The switcher moves between the firm's programs without closing,
 * whatever the filters hide. Not in the URL: the open program is a view on
 * reference data, and the compare selection is what a link carries.
 */
export function FirmSheet({
  openId,
  rows,
  accountNamesFor,
  state,
  onOpenChange,
}: {
  openId: number | null;
  /** Every program of every firm, in the query's order. */
  rows: PropFirmRow[];
  accountNamesFor: (programId: number) => string[];
  state: PropFirmsState;
  /** Another program of the firm, or null to close. */
  onOpenChange: (programId: number | null) => void;
}) {
  const shownId = useRetainedTarget(openId, (id) => id);

  const shown = rows.find((row) => row.program.id === shownId);
  const programs = shown
    ? rows.filter((row) => row.firm.id === shown.firm.id)
    : [];

  return (
    <Sheet
      open={openId !== null && shown !== undefined}
      onOpenChange={(next) => !next && onOpenChange(null)}
    >
      <SheetContent size="medium" className="p-6">
        {shown && (
          <>
            <div className="flex min-h-10 flex-wrap items-center gap-3 pr-10">
              <SheetTitle className="font-semibold text-lg">
                {shown.firm.name}
              </SheetTitle>
              <LinkedBadge names={accountNamesFor(shown.program.id)} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <SheetDescription render={<div />}>
                <FirmMeta firm={shown.firm} />
              </SheetDescription>
              <div className="ml-auto">
                <CompareToggle
                  state={state}
                  programId={shown.program.id}
                  label={`${shown.firm.name} · ${shown.program.name}`}
                />
              </div>
            </div>

            {programs.length > 1 && (
              <fieldset
                aria-label={`Programs of ${shown.firm.name}`}
                className="mt-4 flex flex-wrap gap-1"
              >
                {programs.map(({ program }) => (
                  <Toggle
                    key={program.id}
                    variant="outline"
                    pressed={program.id === shown.program.id}
                    onPressedChange={() => onOpenChange(program.id)}
                    className="h-10 font-normal text-muted-foreground aria-pressed:text-foreground lg:h-8"
                  >
                    {program.name}
                  </Toggle>
                ))}
              </fieldset>
            )}
            {programs.length === 1 && (
              <p className="mt-4 text-muted-foreground text-sm">
                {shown.program.name}
              </p>
            )}

            <div className="mt-5 rounded-lg border p-3">
              <KeyFigures program={shown.program} />
            </div>
            <div className="mt-4">
              <Tags tags={shown.program.summaryTags} />
            </div>

            <dl className="mt-6 flex flex-col gap-4">
              {PROGRAM_FIELD_LABELS.map(([key, label]) => (
                <div key={key} className="flex flex-col gap-0.5">
                  <dt className="text-[11px] text-muted-foreground uppercase tracking-wide">
                    {label}
                  </dt>
                  <dd
                    className={`text-[13px] leading-relaxed ${
                      NUMERIC_FIELDS.has(key) ? "font-mono tabular-nums" : ""
                    }`}
                  >
                    <RuleValue value={shown.program[key]} />
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

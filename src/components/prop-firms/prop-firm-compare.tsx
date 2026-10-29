import { X } from "lucide-react";
import type { PropFirmRow } from "@/db/queries/prop-firms";
import { Link } from "@/lib/i18n/navigation";
import {
  buildPropFirmsHref,
  MAX_COMPARE,
  type PropFirmsState,
  toggleCompare,
} from "@/lib/prop-firms/href";
import { PROGRAM_FIELD_LABELS } from "@/lib/prop-firms/parse";
import { NUMERIC_FIELDS, RuleValue } from "./program-parts";

interface PropFirmCompareProps {
  rows: PropFirmRow[];
  state: PropFirmsState;
}

// Side by side, verbatim, in the order they were picked (Design.md §3.9). No
// winner is marked, nothing is scored and no column is sorted: two firms
// wording the same rule differently is information, and ranking them would be
// the app deciding what the rules mean. A dot only says the wording differs.
export function PropFirmCompare({ rows, state }: PropFirmCompareProps) {
  if (rows.length === 0) return null;

  return (
    <section
      aria-labelledby="prop-firm-compare"
      className="flex flex-col gap-3 rounded-lg border p-4"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id="prop-firm-compare" className="font-semibold text-sm">
          Compare
        </h2>
        <span className="text-muted-foreground text-xs">
          <span className="font-mono tabular-nums">
            {rows.length} / {MAX_COMPARE}
          </span>{" "}
          · as written, nothing ranked · a dot marks differing wording
        </span>
        <Link
          href={buildPropFirmsHref(state, { compare: [] })}
          scroll={false}
          className="ml-auto flex h-10 items-center rounded-md px-2 text-muted-foreground text-xs outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 lg:h-7"
        >
          Clear
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] table-fixed border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="w-40 pb-2 text-left">
                <span className="sr-only">Rule</span>
              </th>
              {rows.map(({ firm, program }) => (
                <th
                  key={program.id}
                  className="pr-4 pb-2 text-left align-top font-normal"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex min-w-0 flex-col">
                      <span className="font-medium">{firm.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {program.name}
                      </span>
                    </div>
                    <Link
                      href={buildPropFirmsHref(state, {
                        compare: toggleCompare(state.compare, program.id),
                      })}
                      scroll={false}
                      aria-label={`Remove ${firm.name} · ${program.name} from compare`}
                      className="-mt-2 -mr-2 ml-auto flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 lg:size-7"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PROGRAM_FIELD_LABELS.map(([key, label]) => {
              const differs =
                new Set(rows.map(({ program }) => program[key])).size > 1;
              return (
                <tr key={key} className="border-t align-top">
                  <th
                    scope="row"
                    className="py-2 pr-3 text-left font-normal text-[11px] text-muted-foreground uppercase tracking-wide"
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          differs ? "bg-foreground/60" : "bg-transparent"
                        }`}
                      />
                      {label}
                      {differs && (
                        <span className="sr-only">, wording differs</span>
                      )}
                    </span>
                  </th>
                  {rows.map(({ program }) => (
                    <td
                      key={program.id}
                      className={`py-2 pr-4 leading-relaxed ${
                        NUMERIC_FIELDS.has(key) ? "font-mono tabular-nums" : ""
                      }`}
                    >
                      <RuleValue value={program[key]} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

import { X } from "lucide-react";
import Link from "next/link";
import type { PropFirmRow } from "@/db/queries/prop-firms";
import {
  buildPropFirmsHref,
  MAX_COMPARE,
  type PropFirmsState,
} from "@/lib/prop-firms/href";
import {
  PROGRAM_FIELD_LABELS,
  type ProgramFieldKey,
} from "@/lib/prop-firms/parse";

interface PropFirmCompareProps {
  rows: PropFirmRow[];
  state: PropFirmsState;
}

// Design.md §3: numbers are mono with tabular figures, because a column of them
// has to line up — and this table is exactly that case. Decided per field, never
// per value: sniffing whether a value looks numeric would be the app reading the
// rule, and it does not do that anywhere. The price is that "None" and "No
// stated cap" are set in mono too, because they share a column with "$1,000".
const NUMERIC_FIELDS: ReadonlySet<ProgramFieldKey> = new Set([
  "accountSize",
  "profitTarget",
  "maxDrawdown",
  "dailyLossLimit",
  "minTradingDays",
  "maxPayoutCycle",
  "profitSplit",
]);

// Side by side, verbatim, in the order they were picked. No winner is marked,
// nothing is scored and no column is sorted: two firms wording the same rule
// differently is information, and ranking them would be the app deciding what
// the rules mean.
export function PropFirmCompare({ rows, state }: PropFirmCompareProps) {
  if (rows.length === 0) return null;

  return (
    <div className="card-surface edge flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="cap">Compare</span>
        {/* Design.md §4.2, secondary variant: glass, never the gradient — the
            table is the main thing on this surface, clearing it is not. The
            three durations are the fixed timing set: 150ms in, 200ms out (so
            brushing past does not flicker), 100ms on press. `active` cancels
            the hover lift because §4.2 presses the button down without moving
            it, and pointer input has both states at once. */}
        <Link
          href={buildPropFirmsHref(state, { compare: [] })}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-ctl border border-white/12 bg-white/5 px-4 font-medium text-fg-muted text-sm transition-[transform,box-shadow,border-color,color,filter] duration-200 ease-[var(--ease-soft)] hover:-translate-y-px hover:border-cyan/35 hover:text-fg hover:shadow-[var(--shadow-neon-hover)] hover:brightness-110 hover:duration-150 focus-visible:shadow-[var(--shadow-focus)] focus-visible:outline-none active:translate-y-0 active:scale-[.978] active:duration-100"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Clear
        </Link>
      </div>

      {rows.length === MAX_COMPARE && (
        <p className="text-fg-subtle text-xs">
          Three at a time. Uncheck one to compare another.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead>
            <tr>
              <th className="cap w-40 border-white/8 border-b py-2 pr-3 text-left align-bottom">
                Rule
              </th>
              {rows.map((row) => (
                <th
                  key={row.program.id}
                  className="border-white/8 border-b py-2 pr-3 text-left align-bottom font-medium text-fg"
                >
                  <span className="block text-sm">{row.firm.name}</span>
                  <span className="block text-fg-muted text-xs">
                    {row.program.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PROGRAM_FIELD_LABELS.map(([key, label]) => (
              <tr key={key}>
                <th
                  scope="row"
                  className="cap border-white/8 border-b py-2 pr-3 text-left align-top"
                >
                  {label}
                </th>
                {rows.map((row) => (
                  <td
                    key={row.program.id}
                    className={`border-white/8 border-b py-2 pr-3 align-top ${
                      NUMERIC_FIELDS.has(key) ? "font-mono tabular-nums" : ""
                    }`}
                  >
                    {row.program[key] ?? (
                      // Not a number, so it keeps the sans face even in a mono
                      // column.
                      <span className="font-sans text-fg-subtle">
                        Not recorded
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

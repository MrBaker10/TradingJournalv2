import { ValueBar } from "@/components/ui/value-bar";
import {
  MISSED_DIMENSION_IDS,
  MISSED_DIMENSION_TITLES,
  type MissedDimensionId,
  type MissedRow,
} from "@/domain/analytics";

interface MissedSetupsSectionProps {
  byDimension: Record<MissedDimensionId, MissedRow[]>;
}

function DimensionCard({ title, rows }: { title: string; rows: MissedRow[] }) {
  return (
    <section className="card-surface edge flex flex-col gap-3 p-5">
      <h3 className="cap">{title}</h3>

      {rows.length === 0 ? (
        <p className="py-4 text-center text-fg-subtle text-sm">
          Nothing missed in this range.
        </p>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-3 border-white/8 border-b pb-1.5">
            <span className="cap">Bucket</span>
            <span className="flex shrink-0 gap-3">
              <span className="cap w-10 text-right">Missed</span>
              <span className="cap w-24 text-right">Of entries</span>
            </span>
          </div>

          <ul className="flex flex-col divide-y divide-white/6">
            {rows.map((row) => (
              <li
                key={row.isNotSet ? "\u0000not-set" : row.label}
                className="flex flex-col gap-1.5 py-2"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className={`truncate text-sm ${
                      row.isNotSet ? "text-fg-subtle italic" : "text-fg"
                    }`}
                  >
                    {row.label}
                  </span>
                  <span className="flex shrink-0 items-baseline gap-3 font-mono text-[13px] tabular-nums">
                    <span className="w-10 text-right text-fg">
                      {row.missed}
                    </span>
                    <span className="w-24 text-right text-fg-muted">
                      {row.share === null
                        ? "—"
                        : `${Math.round(row.share * 100)}% of ${row.entries}`}
                    </span>
                  </span>
                </div>
                {/* A missed setup touches no money: it feeds streak and
                    badges, so it is a process value and takes the same neon
                    fill as the consistency-score bars (Design.md §1). */}
                <ValueBar ratio={row.barRatio} tone="process" />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

// project-overview.md §F: "a separate missed-setups section that touches no
// P&L number". There is deliberately no money column and no R column here —
// a missed setup has no exit, so any figure beyond a count would be invented.
// What it can honestly say is how often the setup was seen and passed on.
export function MissedSetupsSection({ byDimension }: MissedSetupsSectionProps) {
  // Empty is "no bucket in any dimension had anything missed". buildMissedRows
  // already drops the buckets that missed nothing, so an empty list per
  // dimension is the whole test — no second count to keep in step.
  const hasMissed = MISSED_DIMENSION_IDS.some(
    (dimension) => byDimension[dimension].length > 0,
  );

  return (
    <section className="flex flex-col gap-3">
      <div className="ml-2 flex flex-col gap-1">
        <h2 className="cap cap-neon">Missed setups</h2>
        <p className="text-[11.5px] text-fg-subtle">
          A missed setup carries no account, so it counts in every selection —
          the share is measured against the entries visible here.
        </p>
      </div>

      {hasMissed ? (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          {MISSED_DIMENSION_IDS.map((dimension) => (
            <DimensionCard
              key={dimension}
              title={MISSED_DIMENSION_TITLES[dimension]}
              rows={byDimension[dimension]}
            />
          ))}
        </div>
      ) : (
        <p className="py-6 text-center text-fg-subtle text-sm">
          No missed setups in this range. A setup you saw and passed on counts
          the same as a trade.
        </p>
      )}
    </section>
  );
}

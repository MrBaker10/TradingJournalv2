import { useLocale } from "next-intl";
import {
  MISSED_DIMENSION_IDS,
  MISSED_DIMENSION_TITLES,
  type MissedDimensionId,
  type MissedRow,
  zeroLineLayout,
} from "@/domain/analytics";
import { formatShare } from "@/lib/analytics/format";
import { CARD_SURFACE } from "./surface";
import { ThinBar } from "./thin-bar";

/** Buckets shown per dimension; the most missed come first. */
const MISSED_ROW_COUNT = 6;

function MissedCard({ title, rows }: { title: string; rows: MissedRow[] }) {
  const language = useLocale();
  const shown = rows.slice(0, MISSED_ROW_COUNT);
  const layout = zeroLineLayout(
    shown.map((row) => (row.isNotSet ? null : row.missed)),
  );
  return (
    <div className={`flex min-w-0 flex-col gap-3 ${CARD_SURFACE}`}>
      <h3 className="font-medium text-sm">{title}</h3>
      {shown.length === 0 ? (
        <p className="text-muted-foreground text-xs">Nothing missed here.</p>
      ) : (
        <ul className="flex flex-col gap-2 text-xs">
          {shown.map((row, index) => (
            <li key={row.label} className="flex flex-col gap-1">
              <span className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <span
                  className={`truncate ${row.isNotSet ? "text-muted-foreground italic" : ""}`}
                >
                  {row.label}
                </span>
                <span className="font-mono tabular-nums">
                  {row.missed}
                  <span className="text-muted-foreground">
                    {" "}
                    of {row.entries} · {formatShare(row.share, language)}
                  </span>
                </span>
              </span>
              {!row.isNotSet && (
                <ThinBar
                  bar={layout.bars[index]}
                  tone="fill-foreground/35"
                  className="h-[3px]"
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * "Where do I hesitate?": missed setups as counts and as a share of all
 * entries in the bucket, never P&L (Design.md §3.7). A missed setup has no
 * exit, so a money figure here would be invented.
 */
export function MissedSection({
  byDimension,
}: {
  byDimension: Record<MissedDimensionId, MissedRow[]>;
}) {
  if (MISSED_DIMENSION_IDS.every((id) => byDimension[id].length === 0)) {
    return (
      <p className="text-muted-foreground text-sm">
        No missed setups in this range. Log a setup you saw and did not take as
        a missed setup, and the pattern shows here.
      </p>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {MISSED_DIMENSION_IDS.map((dimension) => (
        <MissedCard
          key={dimension}
          title={MISSED_DIMENSION_TITLES[dimension]}
          rows={byDimension[dimension]}
        />
      ))}
    </div>
  );
}

import { DimensionTable } from "@/components/analytics/dimension-table";
import { ExitEfficiencyCard } from "@/components/analytics/exit-efficiency-card";
import { HoldTimeCard } from "@/components/analytics/hold-time-card";
import { MissedSetupsSection } from "@/components/analytics/missed-setups-section";
import { RangeFilter } from "@/components/analytics/range-filter";
import { RiskCalibrationCard } from "@/components/analytics/risk-calibration-card";
import {
  getDimensionBreakdowns,
  getExcursionBuckets,
  getExecutionSummary,
  getMissedSetupBreakdowns,
} from "@/db/queries/analytics";
import { withDisplayCurrency } from "@/db/queries/scope";
import {
  DIMENSION_NOTES,
  DIMENSION_TITLES,
  groupByDimension,
  groupMissedByDimension,
  shouldExplainMissingAvgR,
  splitRecordedDimensions,
} from "@/domain/analytics";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { firstValue } from "@/lib/search-params";
import { rangeForPreset, todayInTimeZone } from "@/lib/time";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface AnalyticsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseDate(value: string | undefined): string | undefined {
  return value && DATE_PATTERN.test(value) ? value : undefined;
}

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const rawParams = await searchParams;
  const user = await getCurrentUser();

  // Typing a date wins over a preset, and the filter clears the other one
  // when either is set, so the two can never quietly disagree. A preset is
  // resolved against the user's own "today" — a calendar boundary is the
  // user's timezone, never the server's (coding-standards.md, Time).
  const from = parseDate(firstValue(rawParams.from));
  const to = parseDate(firstValue(rawParams.to));
  const today = todayInTimeZone(user.timezone);
  const range =
    from || to
      ? { from, to }
      : (rangeForPreset(firstValue(rawParams.range), today) ?? undefined);

  // One display currency for every money figure on the page (display-currency).
  const scope = await withDisplayCurrency({
    userId: user.id,
    selectedAccountId: user.selectedAccountId,
  });

  const [dimensionRows, missedRows, execution, excursions] = await Promise.all([
    getDimensionBreakdowns(scope, range),
    getMissedSetupBreakdowns(scope, range),
    getExecutionSummary(scope, range),
    getExcursionBuckets(scope, range),
  ]);

  const byDimension = groupByDimension(dimensionRows);
  const missedByDimension = groupMissedByDimension(missedRows);
  const { recorded, notRecorded } = splitRecordedDimensions(byDimension);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="page-title ml-2">Analytics</h1>

      <RangeFilter />

      {shouldExplainMissingAvgR(byDimension) && (
        <p className="ml-2 text-[11.5px] text-fg-subtle">
          Avg R shows — until a trade in this range has a stop price.
        </p>
      )}

      {/* Design.md §4.16: one two-column masonry of the dimensions that hold
          data, in dimension order. CSS columns close the gaps a grid leaves
          between cards of different height; break-inside-avoid keeps each
          card whole. */}
      {recorded.length > 0 && (
        <div className="columns-1 gap-6 lg:columns-2">
          {recorded.map((dimension) => (
            <div key={dimension} className="mb-6 break-inside-avoid">
              <DimensionTable
                title={DIMENSION_TITLES[dimension]}
                rows={byDimension[dimension]}
                note={DIMENSION_NOTES[dimension]}
                currency={scope.currency}
              />
            </div>
          ))}
        </div>
      )}

      {notRecorded.length > 0 && (
        <p className="ml-2 text-[11.5px] text-fg-subtle">
          Not recorded in this range:{" "}
          {notRecorded
            .map((dimension) => DIMENSION_TITLES[dimension])
            .join(", ")}
          .
        </p>
      )}

      {/* The three execution sections sit between the dimensions and the
          missed setups: they are about how a trade was run, not about which
          bucket it fell into, and they touch no money figure at all. */}
      <HoldTimeCard summary={execution} />
      <RiskCalibrationCard summary={execution} excursions={excursions} />
      <ExitEfficiencyCard summary={execution} />

      <MissedSetupsSection byDimension={missedByDimension} />
    </div>
  );
}

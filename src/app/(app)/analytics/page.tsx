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
import {
  DIMENSION_IDS,
  DIMENSION_NOTES,
  DIMENSION_TITLES,
  groupByDimension,
  groupMissedByDimension,
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

  const scope = {
    userId: user.id,
    selectedAccountId: user.selectedAccountId,
  };

  const [dimensionRows, missedRows, execution, excursions] = await Promise.all([
    getDimensionBreakdowns(scope, range),
    getMissedSetupBreakdowns(scope, range),
    getExecutionSummary(scope, range),
    getExcursionBuckets(scope, range),
  ]);

  const byDimension = groupByDimension(dimensionRows);
  const missedByDimension = groupMissedByDimension(missedRows);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="page-title ml-2">Analytics</h1>

      <RangeFilter />

      {/* items-start: a dimension with two buckets must not be stretched to
          the height of one with twenty. */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {DIMENSION_IDS.map((dimension) => (
          <DimensionTable
            key={dimension}
            title={DIMENSION_TITLES[dimension]}
            rows={byDimension[dimension]}
            note={DIMENSION_NOTES[dimension]}
          />
        ))}
      </div>

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

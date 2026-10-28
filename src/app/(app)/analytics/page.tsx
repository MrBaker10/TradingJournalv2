import type { ReactNode } from "react";
import { BucketRanking } from "@/components/analytics/bucket-ranking";
import { ColumnChart } from "@/components/analytics/column-chart";
import { DimensionCard } from "@/components/analytics/dimension-card";
import { DimensionSheet } from "@/components/analytics/dimension-sheet";
import { ExecutionSection } from "@/components/analytics/execution-section";
import { MissedSection } from "@/components/analytics/missed-section";
import { QuestionToc } from "@/components/analytics/question-toc";
import { RangeFilter } from "@/components/analytics/range-filter";
import {
  getDimensionBreakdowns,
  getExcursionBuckets,
  getExecutionSummary,
  getMissedSetupBreakdowns,
} from "@/db/queries/analytics";
import { withDisplayCurrency } from "@/db/queries/scope";
import {
  ANALYTICS_QUESTIONS,
  DIMENSION_TITLES,
  type DimensionId,
  groupByDimension,
  groupMissedByDimension,
  type QuestionId,
  rankBuckets,
  shouldExplainMissingAvgR,
  splitRecordedDimensions,
} from "@/domain/analytics";
import { dimensionName } from "@/lib/analytics/format";
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
  const { recorded } = splitRecordedDimensions(byDimension);
  const ranking = rankBuckets(byDimension);
  const currency = scope.currency;

  /** A question's dimensions as small cards, and the ones without data. */
  const cards = (dimensions: readonly DimensionId[]) => {
    const shown = dimensions.filter((id) => recorded.includes(id));
    const missing = dimensions.filter((id) => !recorded.includes(id));
    return (
      <>
        {shown.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((dimension) => (
              <DimensionCard
                key={dimension}
                dimension={dimension}
                rows={byDimension[dimension]}
                currency={currency}
              />
            ))}
          </div>
        )}
        {missing.length > 0 && (
          <p className="text-muted-foreground text-xs">
            Not recorded in this range:{" "}
            {missing
              .map((id) => dimensionName(DIMENSION_TITLES[id]))
              .join(", ")}
            . A trade fills them when it carries the field.
          </p>
        )}
      </>
    );
  };

  // What answers a question beside its cards. Weekday and hour are drawn as
  // columns here, so they get no card of their own.
  const answers: Partial<Record<QuestionId, ReactNode>> = {
    results: (
      <BucketRanking
        holdingUp={ranking.holdingUp}
        dragging={ranking.dragging}
        currency={currency}
      />
    ),
    when: (
      <div className="grid gap-3 lg:grid-cols-[2fr_3fr]">
        <ColumnChart
          dimension="weekday"
          rows={byDimension.weekday}
          currency={currency}
        />
        <ColumnChart
          dimension="hour"
          rows={byDimension.hour}
          currency={currency}
        />
      </div>
    ),
    execution: <ExecutionSection summary={execution} excursions={excursions} />,
    hesitate: <MissedSection byDimension={missedByDimension} />,
  };
  const charted: readonly DimensionId[] = ["weekday", "hour"];

  return (
    <DimensionSheet byDimension={byDimension} currency={currency}>
      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <QuestionToc />
        <div className="flex min-w-0 flex-col gap-10">
          <header className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="page-title">Analytics</h1>
              <p className="text-muted-foreground text-sm">
                Net P&amp;L with avg R beside it. Open any card for the detail.
              </p>
            </div>
            <RangeFilter />
            {shouldExplainMissingAvgR(byDimension) && (
              <p className="text-muted-foreground text-xs">
                Avg R shows — until a trade in this range has a stop price.
              </p>
            )}
          </header>

          {/* From lg the last question is at least a screen high, so every
              question can scroll to the top: a click on the table of contents
              brings it there and the mark follows (question-toc.tsx). */}
          {ANALYTICS_QUESTIONS.map((question) => (
            <section
              key={question.id}
              id={question.id}
              aria-labelledby={`${question.id}-heading`}
              className="flex scroll-mt-6 flex-col gap-4 border-t pt-8 lg:last:min-h-[calc(100vh-1.5rem)]"
            >
              <div className="flex flex-col gap-0.5">
                <h2
                  id={`${question.id}-heading`}
                  className="font-semibold text-lg tracking-tight"
                >
                  {question.title}
                </h2>
                <p className="text-muted-foreground text-sm">{question.hint}</p>
              </div>
              {answers[question.id]}
              {cards(question.dimensions.filter((id) => !charted.includes(id)))}
            </section>
          ))}
        </div>
      </div>
    </DimensionSheet>
  );
}

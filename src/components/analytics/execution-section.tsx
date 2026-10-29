import { useLocale } from "next-intl";
import { TermInfo } from "@/components/terms/term-info";
import type { ExecutionSummaryRow } from "@/db/queries/analytics";
import { zeroLineLayout } from "@/domain/analytics";
import {
  buildExcursionRows,
  type ExcursionCount,
  type ExcursionKind,
  formatHoldTime,
  OUTCOME_LABELS,
  OUTCOMES,
  type Outcome,
} from "@/domain/execution";
import { columnRect, toPercent } from "@/lib/analytics/columns";
import { formatShare } from "@/lib/analytics/format";
import type { Language } from "@/lib/i18n/languages";
import { formatFixed } from "@/lib/numbers";
import { CARD_SURFACE } from "./surface";
import { ThinBar } from "./thin-bar";

// Winners against losers (Design.md §3.7). No figure here is money, so the
// two series are two strengths of one neutral, never the sign colours that
// belong to money (Design.md §2); the legend says which is which.

const OUTCOME_FILL: Record<Outcome, string> = {
  winner: "fill-foreground/60",
  loser: "fill-foreground/25",
};

const OUTCOME_DOT: Record<Outcome, string> = {
  winner: "bg-foreground/60",
  loser: "bg-foreground/25",
};

const KIND_TITLES: Record<ExcursionKind, string> = {
  mae: "Adverse excursion (MAE)",
  mfe: "Favourable excursion (MFE)",
};

/**
 * An R without a sign: excursions are magnitudes, and the R left after the
 * exit was never realised, so a "+" would read like a gain.
 */
function plainR(value: number | null | undefined, language: Language): string {
  return value === null || value === undefined
    ? "—"
    : `${formatFixed(value, 2, language)}R`;
}

function rowOf(summary: ExecutionSummaryRow[], outcome: Outcome) {
  return summary.find((row) => row.outcome === outcome);
}

function Legend() {
  return (
    <ul className="flex gap-4 text-muted-foreground text-xs">
      {OUTCOMES.map((outcome) => (
        <li key={outcome} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-sm ${OUTCOME_DOT[outcome]}`}
          />
          {OUTCOME_LABELS[outcome]}
        </li>
      ))}
    </ul>
  );
}

function Figure({
  title,
  info,
  children,
}: {
  title: string;
  /** An info icon for the title's term (Design.md §3.14). */
  info?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-3 ${CARD_SURFACE}`}>
      <div className="flex items-center gap-1.5">
        <h3 className="font-medium text-sm">{title}</h3>
        {info}
      </div>
      {children}
    </div>
  );
}

function HoldTime({ summary }: { summary: ExecutionSummaryRow[] }) {
  const language = useLocale();
  const layout = zeroLineLayout(
    OUTCOMES.map((outcome) => rowOf(summary, outcome)?.holdMinutes ?? null),
  );
  return (
    <Figure title="Hold time">
      <dl className="flex flex-col gap-3 text-xs">
        {OUTCOMES.map((outcome, index) => {
          const row = rowOf(summary, outcome);
          return (
            <div key={outcome} className="flex flex-col gap-1">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">
                  {OUTCOME_LABELS[outcome]}
                </dt>
                <dd className="font-mono tabular-nums">
                  {formatHoldTime(row?.holdMinutes ?? null)}
                  <span className="ml-1.5 text-muted-foreground">
                    n={row?.holdTrades ?? 0}
                  </span>
                </dd>
              </div>
              <ThinBar
                bar={layout.bars[index]}
                tone={OUTCOME_FILL[outcome]}
                className="h-1.5"
              />
            </div>
          );
        })}
      </dl>
      <dl className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-4 gap-y-1 border-t pt-3 text-xs">
        <span />
        <dt className="text-right text-muted-foreground">Avg MAE</dt>
        <dt className="text-right text-muted-foreground">Avg MFE</dt>
        {OUTCOMES.map((outcome) => {
          const row = rowOf(summary, outcome);
          return [
            <dt key={`${outcome}-label`} className="text-muted-foreground">
              {OUTCOME_LABELS[outcome]}
            </dt>,
            <dd
              key={`${outcome}-mae`}
              className="text-right font-mono tabular-nums"
            >
              {plainR(row?.avgMaeR, language)}
            </dd>,
            <dd
              key={`${outcome}-mfe`}
              className="text-right font-mono tabular-nums"
            >
              {plainR(row?.avgMfeR, language)}
            </dd>,
          ];
        })}
      </dl>
    </Figure>
  );
}

/**
 * One excursion distribution, winners and losers side by side per bucket,
 * each as its share of that outcome's trades with a value, so a hundred
 * winners and ten losers compare by shape. Hand-built SVG in percent.
 */
function Excursions({
  kind,
  excursions,
  info,
}: {
  kind: ExcursionKind;
  excursions: ExcursionCount[];
  info?: React.ReactNode;
}) {
  const language = useLocale();
  const series = OUTCOMES.map((outcome) => ({
    outcome,
    rows: buildExcursionRows(kind, outcome, excursions),
  }));
  if (series.every(({ rows }) => rows.length === 0)) {
    return (
      <Figure title={KIND_TITLES[kind]} info={info}>
        <p className="text-muted-foreground text-xs">
          No {kind.toUpperCase()} recorded in this range. It is a manual field
          on trades with a stop price.
        </p>
      </Figure>
    );
  }
  const labels = (series.find(({ rows }) => rows.length > 0)?.rows ?? []).map(
    (row) => row.label,
  );
  const shares = labels.flatMap((_, index) =>
    series.map(({ rows }) => rows[index]?.share ?? 0),
  );
  const layout = zeroLineLayout(shares);

  return (
    <Figure title={KIND_TITLES[kind]} info={info}>
      <svg className="block h-28 w-full" aria-hidden="true">
        {labels.map((label, bucket) =>
          series.map(({ outcome }, side) => {
            const bar = layout.bars[bucket * series.length + side];
            if (!bar || bar.length === 0) return null;
            const rect = columnRect(
              bar,
              bucket,
              labels.length,
              side,
              series.length,
            );
            return (
              <rect
                key={`${label}-${outcome}`}
                x={`${rect.x}%`}
                y={`${rect.y}%`}
                width={`${rect.width}%`}
                height={`${rect.height}%`}
                rx="1"
                className={OUTCOME_FILL[outcome]}
              >
                <title>
                  {`${OUTCOME_LABELS[outcome]} · ${label}: ${formatShare(shares[bucket * series.length + side], language)}`}
                </title>
              </rect>
            );
          }),
        )}
      </svg>
      <div className="flex">
        {labels.map((label) => (
          <span
            key={label}
            className="min-w-0 flex-1 text-center text-[10px] text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        Share of each outcome&apos;s trades with a value.
      </p>
    </Figure>
  );
}

function ExitEfficiency({ summary }: { summary: ExecutionSummaryRow[] }) {
  const language = useLocale();
  const winners = rowOf(summary, "winner");
  const share = winners?.capturedShare ?? null;
  return (
    <Figure title="Exit efficiency">
      <div className="flex items-baseline gap-2">
        <span className="font-mono font-semibold text-2xl tabular-nums">
          {formatShare(share, language)}
        </span>
        <span className="text-muted-foreground text-xs">
          of the move kept by winners · n={winners?.capturedTrades ?? 0}
        </span>
      </div>
      <ThinBar
        bar={share === null ? null : { start: 0, length: toPercent(share) }}
        tone="fill-foreground/35"
        className="h-1.5"
      />
      <dl className="flex justify-between gap-2 text-xs">
        <dt className="text-muted-foreground">
          Left after the exit (hypothetical)
        </dt>
        <dd className="font-mono tabular-nums">
          {plainR(winners?.avgLeftOnTableR, language)}
          <span className="ml-1.5 text-muted-foreground">
            n={winners?.leftOnTableTrades ?? 0}
          </span>
        </dd>
      </dl>
      <p className="text-muted-foreground text-xs">
        Post-exit moves are hypothetical: never realised, never a gain. Winners
        only, where a post-exit MFE was recorded.
      </p>
    </Figure>
  );
}

/** "How do I execute?": hold time, both excursions and the exit. */
export function ExecutionSection({
  summary,
  excursions,
}: {
  summary: ExecutionSummaryRow[];
  excursions: ExcursionCount[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <Legend />
      <div className="grid gap-3 md:grid-cols-2">
        <HoldTime summary={summary} />
        <ExitEfficiency summary={summary} />
        {/* MFE and MAE share one explanation, on the first of the two. */}
        <Excursions
          kind="mae"
          excursions={excursions}
          info={<TermInfo term="mfeMae" />}
        />
        <Excursions kind="mfe" excursions={excursions} />
      </div>
    </div>
  );
}

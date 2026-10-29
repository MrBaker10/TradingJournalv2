import { useLocale } from "next-intl";
import type { RuleState, RuleStatus } from "@/domain/rule-status";
import { formatCents } from "@/lib/money";
import { formatDecimalString, formatFixed } from "@/lib/numbers";

// The rule status of a linked account's current attempt (Design.md §2,
// semantic tokens). Figures in USD whatever the display currency; the state word
// carries the meaning, colour only repeats it. No glow, nothing celebrates.

const STATE_TONE: Record<RuleState, string> = {
  ok: "text-foreground",
  close: "text-practice-foreground",
  breached: "text-negative",
};

const STATE_WORD: Record<RuleState, string | null> = {
  ok: null,
  close: "Close",
  breached: "Breached",
};

function RuleLine({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono tabular-nums">{children}</dd>
    </div>
  );
}

function SubtleText({ children }: { children: React.ReactNode }) {
  return <span className="font-sans text-muted-foreground">{children}</span>;
}

/**
 * A checked rule's line: the figure the state is about in its tone, the text
 * around it in `foreground`, then the state word in the same tone.
 */
function JudgedFigure({
  state,
  before = "",
  figure,
  after = "",
}: {
  state: RuleState;
  before?: string;
  figure: string;
  after?: string;
}) {
  const word = STATE_WORD[state];
  return (
    <span className="text-foreground">
      {before}
      <span className={STATE_TONE[state]}>{figure}</span>
      {after}
      {word && (
        <span className={`ml-2 font-sans ${STATE_TONE[state]}`}>{word}</span>
      )}
    </span>
  );
}

function ConsistencyFigure({
  consistency,
}: {
  consistency: RuleStatus["consistency"];
}) {
  const language = useLocale();
  if (consistency.status === "not_set") return <SubtleText>Not set</SubtleText>;
  if (!consistency.checked) return <SubtleText>No profit yet</SubtleText>;
  const share = formatFixed(consistency.shareTenthsPercent / 10, 1, language);
  const limit = formatDecimalString(consistency.limitPercent, language);
  return (
    <JudgedFigure
      state={consistency.status}
      before={`Best day ${formatCents(consistency.bestDayCents, { language })} · `}
      figure={`${share} %`}
      after={` of ${formatCents(consistency.totalProfitCents, { language })} · limit ${limit} %`}
    />
  );
}

/** One line per rule, the same on the account's settings and the dashboard card. */
export function RuleStatusLines({ status }: { status: RuleStatus }) {
  const { profitTarget, drawdown, dailyLoss, consistency, minTradingDays } =
    status;
  const language = useLocale();
  return (
    <dl className="flex flex-col gap-1.5">
      <RuleLine label="Profit target">
        <span className="text-foreground">
          {formatCents(profitTarget.progressCents, { signed: true, language })}{" "}
          of {formatCents(profitTarget.targetCents, { language })}
        </span>
      </RuleLine>
      <RuleLine label="Max drawdown">
        {drawdown.status === "not_checkable" ? (
          <SubtleText>Not checkable — no intraday balance</SubtleText>
        ) : (
          <JudgedFigure
            state={drawdown.status}
            figure={formatCents(drawdown.distanceCents, { language })}
            after={` to floor ${formatCents(drawdown.floorCents, { language })}`}
          />
        )}
      </RuleLine>
      <RuleLine label="Daily loss limit">
        {dailyLoss.status === "not_set" ? (
          <SubtleText>Not set</SubtleText>
        ) : (
          <JudgedFigure
            state={dailyLoss.status}
            before={`Today ${formatCents(dailyLoss.todayNetCents, { signed: true, language })} · `}
            figure={formatCents(dailyLoss.distanceCents, { language })}
            after={` left of ${formatCents(dailyLoss.limitCents, { language })}`}
          />
        )}
      </RuleLine>
      <RuleLine label="Consistency">
        <ConsistencyFigure consistency={consistency} />
      </RuleLine>
      <RuleLine label="Minimum trading days">
        {minTradingDays.status === "not_set" ? (
          <SubtleText>Not set</SubtleText>
        ) : (
          <span className="text-foreground">
            {minTradingDays.doneDays} of {minTradingDays.requiredDays} days
          </span>
        )}
      </RuleLine>
    </dl>
  );
}

import type { RuleState, RuleStatus } from "@/domain/rule-status";
import { formatCents } from "@/lib/money";

// The rule status of a linked account's current attempt (Design.md §2,
// semantic tokens). Figures in USD whatever the display currency; the state word
// carries the meaning, colour only repeats it. No glow, nothing celebrates.

const STATE_TONE: Record<RuleState, string> = {
  ok: "text-foreground",
  close: "text-amber-400",
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
  if (consistency.status === "not_set") return <SubtleText>Not set</SubtleText>;
  if (!consistency.checked) return <SubtleText>No profit yet</SubtleText>;
  const share = (consistency.shareTenthsPercent / 10).toFixed(1);
  return (
    <JudgedFigure
      state={consistency.status}
      before={`Best day ${formatCents(consistency.bestDayCents)} · `}
      figure={`${share} %`}
      after={` of ${formatCents(consistency.totalProfitCents)} · limit ${consistency.limitPercent} %`}
    />
  );
}

/** One line per rule, the same on the account's settings and the dashboard card. */
export function RuleStatusLines({ status }: { status: RuleStatus }) {
  const { profitTarget, drawdown, dailyLoss, consistency, minTradingDays } =
    status;
  return (
    <dl className="flex flex-col gap-1.5">
      <RuleLine label="Profit target">
        <span className="text-foreground">
          {formatCents(profitTarget.progressCents, { signed: true })} of{" "}
          {formatCents(profitTarget.targetCents)}
        </span>
      </RuleLine>
      <RuleLine label="Max drawdown">
        {drawdown.status === "not_checkable" ? (
          <SubtleText>Not checkable — no intraday balance</SubtleText>
        ) : (
          <JudgedFigure
            state={drawdown.status}
            figure={formatCents(drawdown.distanceCents)}
            after={` to floor ${formatCents(drawdown.floorCents)}`}
          />
        )}
      </RuleLine>
      <RuleLine label="Daily loss limit">
        {dailyLoss.status === "not_set" ? (
          <SubtleText>Not set</SubtleText>
        ) : (
          <JudgedFigure
            state={dailyLoss.status}
            before={`Today ${formatCents(dailyLoss.todayNetCents, { signed: true })} · `}
            figure={formatCents(dailyLoss.distanceCents)}
            after={` left of ${formatCents(dailyLoss.limitCents)}`}
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

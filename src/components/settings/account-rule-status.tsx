import type { AccountRulesRow } from "@/db/queries/account-rules";
import type { DrawdownStatus, RuleStatus } from "@/domain/rule-status";
import { formatCents } from "@/lib/money";
import { formatDateWithYear } from "@/lib/time";

// The rule status of a linked account's current attempt (Design.md §4.12,
// "Rule status"). Figures in USD; the state word carries the meaning, colour
// only repeats it. No glow, nothing celebrates.

const DRAWDOWN_TONE: Record<DrawdownStatus["status"], string> = {
  ok: "text-fg",
  close: "text-warning",
  breached: "text-danger-fg",
};

const DRAWDOWN_WORD: Record<DrawdownStatus["status"], string | null> = {
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
      <dt className="text-fg-muted">{label}</dt>
      <dd className="font-mono tabular-nums">{children}</dd>
    </div>
  );
}

function SubtleText({ children }: { children: React.ReactNode }) {
  return <span className="font-sans text-fg-subtle">{children}</span>;
}

/** "Pending" for a rule a later ticket evaluates, "Not set" when left empty. */
function Unevaluated({ set }: { set: boolean }) {
  return <SubtleText>{set ? "Pending" : "Not set"}</SubtleText>;
}

export function AccountRuleStatus({
  rules,
  status,
}: {
  rules: AccountRulesRow;
  status: RuleStatus;
}) {
  const { profitTarget, drawdown, minTradingDays } = status;
  return (
    <section
      aria-label="Rule status"
      className="mt-3 border-t border-white/8 pt-3 text-sm"
    >
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
        <h4 className="cap">Rule status</h4>
        <span className="text-xs text-fg-subtle">
          Since {formatDateWithYear(rules.evaluationStart)}
        </span>
      </div>
      <dl className="flex flex-col gap-1.5">
        <RuleLine label="Profit target">
          <span className="text-fg">
            {formatCents(profitTarget.progressCents, { signed: true })} of{" "}
            {formatCents(profitTarget.targetCents)}
          </span>
        </RuleLine>
        <RuleLine label="Max drawdown">
          {drawdown.status === "not_checkable" ? (
            <SubtleText>Not checkable — no intraday balance</SubtleText>
          ) : (
            <span className={DRAWDOWN_TONE[drawdown.status]}>
              {formatCents(drawdown.distanceCents)}{" "}
              <span className="text-fg">
                to floor {formatCents(drawdown.floorCents)}
              </span>
              {DRAWDOWN_WORD[drawdown.status] && (
                <span className="ml-2 font-sans">
                  {DRAWDOWN_WORD[drawdown.status]}
                </span>
              )}
            </span>
          )}
        </RuleLine>
        <RuleLine label="Daily loss limit">
          <Unevaluated set={rules.dailyLossLimitCents !== null} />
        </RuleLine>
        <RuleLine label="Consistency">
          <Unevaluated set={rules.consistencyPercent !== null} />
        </RuleLine>
        <RuleLine label="Minimum trading days">
          {minTradingDays.status === "not_set" ? (
            <Unevaluated set={false} />
          ) : (
            <span className="text-fg">
              {minTradingDays.doneDays} of {minTradingDays.requiredDays} days
            </span>
          )}
        </RuleLine>
      </dl>
    </section>
  );
}

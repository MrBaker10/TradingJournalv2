import { RuleStatusLines } from "@/components/rule-status/rule-status-lines";
import type { RuleState } from "@/domain/rule-status";
import type { AttemptStatus } from "@/lib/prop-firms/rule-status";
import { formatDateWithYear } from "@/lib/time";
import { HELP_TEXT, PART_HEADING } from "./fields";
import { RuleDot } from "./rule-dot";

// A linked account's rule status at the top of its sheet, the same lines as
// the dashboard card.
export function AccountRuleStatus({
  attempt,
  state,
}: {
  attempt: AttemptStatus;
  state: RuleState | null;
}) {
  return (
    <section
      aria-labelledby="account-rule-status"
      className="flex flex-col gap-2 rounded-lg border p-4 text-sm"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <RuleDot state={state} />
        <h3 id="account-rule-status" className={PART_HEADING}>
          Rule status
        </h3>
        <span className={HELP_TEXT}>
          Since {formatDateWithYear(attempt.start)}
        </span>
      </div>
      <RuleStatusLines status={attempt.status} />
    </section>
  );
}

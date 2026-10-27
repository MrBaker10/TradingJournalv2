import { RuleStatusLines } from "@/components/rule-status/rule-status-lines";
import type { LinkedRuleStatus } from "@/lib/prop-firms/rule-status";
import { formatDateWithYear } from "@/lib/time";

// The dashboard's rule status, only while exactly one linked account is
// selected. Rules are money, not process, so nothing here takes the process
// colour.
export function RuleStatusCard({
  ruleStatus: { link, attempt },
}: {
  ruleStatus: LinkedRuleStatus;
}) {
  return (
    <section
      aria-labelledby="rule-status-heading"
      className="flex flex-col gap-2 text-sm"
    >
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2
          id="rule-status-heading"
          className="text-[11px] text-muted-foreground uppercase tracking-wider"
        >
          Rule status
        </h2>
        <span className="text-muted-foreground text-xs">
          {link.firmName} · {link.programName} · Since{" "}
          {formatDateWithYear(attempt.start)}
        </span>
      </div>
      <RuleStatusLines status={attempt.status} />
    </section>
  );
}

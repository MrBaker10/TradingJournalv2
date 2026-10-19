import { RuleStatusLines } from "@/components/rule-status/rule-status-lines";
import type { LinkedRuleStatus } from "@/lib/prop-firms/rule-status";
import { formatDateWithYear } from "@/lib/time";

// The dashboard's "Rule status" card, only while exactly one linked account
// is selected (Design.md §4.12). `edge`, not `edge-neon`: rules are money,
// not process.
export function RuleStatusCard({
  ruleStatus: { link, attempt },
}: {
  ruleStatus: LinkedRuleStatus;
}) {
  return (
    <section
      aria-label="Rule status"
      className="card-surface edge flex flex-col gap-3 p-5 text-sm"
    >
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="cap">Rule status</h2>
        <span className="text-xs text-fg-subtle">
          {link.firmName} · {link.programName} · Since{" "}
          {formatDateWithYear(attempt.start)}
        </span>
      </div>
      <RuleStatusLines status={attempt.status} />
    </section>
  );
}

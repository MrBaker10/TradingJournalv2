import { RuleStatusLines } from "@/components/rule-status/rule-status-lines";
import type { AttemptStatus } from "@/lib/prop-firms/rule-status";
import { formatDateWithYear } from "@/lib/time";

// The rule status panel under a linked account's row (Design.md §4.12).
export function AccountRuleStatus({ attempt }: { attempt: AttemptStatus }) {
  return (
    <section
      aria-label="Rule status"
      className="mt-3 border-t border-white/8 pt-3 text-sm"
    >
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
        <h4 className="cap">Rule status</h4>
        <span className="text-xs text-fg-subtle">
          Since {formatDateWithYear(attempt.start)}
        </span>
      </div>
      <RuleStatusLines status={attempt.status} />
    </section>
  );
}

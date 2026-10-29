import { ChevronRight } from "lucide-react";
import { RuleStatusLines } from "@/components/rule-status/rule-status-lines";
import { Link } from "@/lib/i18n/navigation";
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
        {/* Straight into the account's settings sheet (Design.md §3.8). */}
        <Link
          href={`/settings?account=${link.accountId}`}
          className="group ml-auto inline-flex items-center gap-0.5 rounded-sm text-muted-foreground text-xs outline-none transition-colors duration-150 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Account rules
          <ChevronRight
            aria-hidden="true"
            className="size-3.5 transition-[translate] duration-150 group-hover:translate-x-0.5"
          />
        </Link>
      </div>
      <RuleStatusLines status={attempt.status} />
    </section>
  );
}

import type { RuleState } from "@/domain/rule-status";
import { cn } from "@/lib/utils";

// The rule dot of Design.md §3.8: the worst state of a linked account's
// checked rules. Amber is a calm warning, never a loss; a breach takes
// `negative`. The label carries the meaning, the colour only repeats it.

const DOT: Record<RuleState | "unknown", { tone: string; label: string }> = {
  ok: { tone: "bg-positive/70", label: "Rules ok" },
  close: { tone: "bg-amber-400", label: "Close to a limit" },
  breached: { tone: "bg-negative", label: "Rule breached" },
  unknown: { tone: "bg-muted-foreground/40", label: "Not checkable" },
};

export function RuleDot({
  state,
  className,
}: {
  /** null when the attempt could not be read. */
  state: RuleState | null;
  className?: string;
}) {
  const { tone, label } = DOT[state ?? "unknown"];
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        tone,
        className,
      )}
    />
  );
}

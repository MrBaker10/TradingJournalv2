export type MetricTone = "money" | "neutral" | "process";

interface MetricCellProps {
  label: string;
  /** Already formatted — the cell does no arithmetic. */
  value: string;
  context?: string;
  tone: MetricTone;
  /** Sign of the underlying money value; ignored unless tone is "money". */
  sign?: number;
  /** Design.md §4.7: only "Today" is highlighted. */
  highlight?: boolean;
}

// Design.md §4.7 and §1: money gets a semantic colour and nothing else,
// process values glow, everything else stays plain white. There is no fourth
// case here — rule limits are amber, and the only rule limit in the app needs
// the prop firm link that Roadmap/Future holds.
function valueClass(tone: MetricTone, sign: number): string {
  if (tone === "process") return "text-glow";
  if (tone !== "money" || sign === 0) return "text-fg";
  return sign > 0 ? "text-success-fg" : "text-danger-fg";
}

export function MetricCell({
  label,
  value,
  context,
  tone,
  sign = 0,
  highlight = false,
}: MetricCellProps) {
  return (
    // Design.md §5: 150ms in, 200ms out. The surface lightens and nothing
    // else — a metric cell is not clickable, and the lift is this project's
    // sign for "you can press this" (same split as the calendar grid).
    <div
      className={`flex flex-col gap-1 p-4 shadow-[var(--shadow-metric-cell)] transition-[background-color] duration-200 ease-[var(--ease-soft)] hover:bg-white/[0.03] hover:duration-150 ${
        highlight ? "bg-[image:var(--gradient-today)]" : ""
      }`}
    >
      <span className="cap">{label}</span>
      <span
        className={`font-mono text-[21px] font-bold tabular-nums ${valueClass(
          tone,
          sign,
        )}`}
      >
        {value}
      </span>
      <span className="min-h-[15px] text-[11.5px] text-fg-subtle">
        {context ?? ""}
      </span>
    </div>
  );
}

import type { ReactNode } from "react";

/**
 * One row of the dashboard's key/value lists (Design.md §3.2): label left,
 * figure right in tabular mono, a dashed hairline under it. Used inside a `<dl>`.
 */
export function MetricRow({
  label,
  note,
  info,
  tone = "",
  children,
}: {
  label: string;
  /** An info icon for the label's term (Design.md §3.14), right after it. */
  info?: ReactNode;
  /** Secondary context after the label, such as "all time" or a date. */
  note?: string;
  /** Colour class of the figure: sign colour for money, process for process. */
  tone?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed py-1">
      <dt className="text-muted-foreground">
        {label}
        {info && (
          <span className="ml-1.5 inline-flex align-middle">{info}</span>
        )}
        {note && <span className="ml-2 text-xs">{note}</span>}
      </dt>
      <dd className={`font-mono tabular-nums ${tone}`}>{children}</dd>
    </div>
  );
}

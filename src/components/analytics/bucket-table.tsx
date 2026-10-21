import { Fragment, type ReactNode } from "react";

export interface BucketColumn {
  label: string;
  /** Fixed width from `sm` up, as a literal class so Tailwind sees it. */
  width: string;
}

// Design.md §4.16: the one row layout of every Analytics table. From `sm` the
// bucket sits left and the figures in fixed right-aligned columns; below it the
// row is two lines — the bucket in full, then the figures — and the column
// header becomes one label line in the same order.

interface BucketHeaderProps {
  bucketLabel: string;
  columns: BucketColumn[];
  /** Only the label line below `sm`; from `sm` the table has no header. */
  narrowOnly?: boolean;
}

export function BucketHeader({
  bucketLabel,
  columns,
  narrowOnly = false,
}: BucketHeaderProps) {
  return (
    <div
      className={`border-white/8 border-b pb-1.5 ${narrowOnly ? "sm:hidden" : ""}`}
    >
      <div className="hidden items-baseline justify-between gap-3 sm:flex">
        <span className="cap">{bucketLabel}</span>
        <span className="flex shrink-0 gap-3">
          {columns.map((column) => (
            <span
              key={column.label}
              className={`cap text-right ${column.width}`}
            >
              {column.label}
            </span>
          ))}
        </span>
      </div>
      <span className="cap sm:hidden">
        {columns.map((column) => column.label).join(" · ")}
      </span>
    </div>
  );
}

export interface BucketCell {
  text: string;
  /** The colour class: the row never tints a figure itself (Design.md §1). */
  tone: string;
}

interface BucketRowProps {
  label: string;
  /** The bucket that holds no value — italic and subtle, Design.md §4.16. */
  isNotSet?: boolean;
  columns: BucketColumn[];
  cells: BucketCell[];
  /** A `ValueBar` below the figures; some tables have none. */
  bar?: ReactNode;
}

export function BucketRow({
  label,
  isNotSet = false,
  columns,
  cells,
  bar,
}: BucketRowProps) {
  return (
    <li className="flex flex-col gap-1.5 py-2">
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <span
          className={`break-words text-sm sm:truncate ${
            isNotSet ? "text-fg-subtle italic" : "text-fg"
          }`}
        >
          {label}
        </span>
        <span className="flex items-baseline gap-x-1.5 font-mono text-[13px] tabular-nums sm:shrink-0 sm:gap-3">
          {cells.map((cell, index) => (
            <Fragment key={columns[index].label}>
              {index > 0 && (
                <span aria-hidden="true" className="text-fg-subtle sm:hidden">
                  ·
                </span>
              )}
              <span
                className={`sm:text-right ${columns[index].width} ${cell.tone}`}
              >
                {cell.text}
              </span>
            </Fragment>
          ))}
        </span>
      </div>
      {bar}
    </li>
  );
}

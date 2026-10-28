import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HELP_TEXT } from "./fields";

/**
 * A plain settings row (Design.md §3.8): what it is, one line about it and
 * its one action on the right. A flow the action starts (a password form,
 * the two-factor steps) opens below the row as `children`.
 */
export function SettingsRow({
  title,
  hint,
  action,
  className,
  children,
}: {
  title: ReactNode;
  hint: ReactNode;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-4 py-4", className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 basis-60 flex-col gap-0.5">
          <span className="text-sm">{title}</span>
          <span className={HELP_TEXT}>{hint}</span>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}

/** The one action of a row: an outline button, 40 px on touch. */
export const ROW_ACTION = "h-10 lg:h-9";

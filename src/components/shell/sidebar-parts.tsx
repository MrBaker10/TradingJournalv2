"use client";

import type { ReactElement } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Pieces the sidebar, its footer and the theme menu share.

/**
 * Rest, hover, press and focus of every sidebar item (Design.md §3.1, §4).
 * Below `lg` the items sit in the touch drawer and get 40 px (§5).
 */
export const SIDEBAR_ITEM_CLASS =
  "flex h-8 max-lg:h-10 items-center rounded-md text-[13px] transition-[color,background-color,scale] duration-150 focus-visible:outline-2 focus-visible:outline-ring active:scale-[0.98]";

/**
 * A label beside an icon that only shows as a tooltip while the sidebar is
 * the collapsed icon rail. Expanded, the visible label says it already.
 */
export function RailTip({
  collapsed,
  label,
  children,
}: {
  collapsed: boolean;
  label: ReactElement | string;
  children: ReactElement;
}) {
  if (!collapsed) return children;
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

/** An icon-only button in the sidebar footer: "Sign out" and the theme menu. */
export const SIDEBAR_ICON_BUTTON_CLASS =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70 transition-[color,background-color,scale] duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-ring active:scale-95";

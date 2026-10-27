"use client";

import {
  Command as CommandIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { Kbd } from "@/components/ui/kbd";
import { AccountSwitcher, type SwitcherAccount } from "./account-switcher";
import { LOG_TRADE_HREF } from "./nav-items";
import { RailTip, SIDEBAR_ITEM_CLASS, SidebarContent } from "./sidebar-content";

/** What the app shell needs from the layout, for sidebar and mobile shell alike. */
export interface ShellProps {
  displayName: string;
  accounts: SwitcherAccount[];
  selectedAccountId: number | null;
}

/**
 * The desktop sidebar from `lg` (Design.md §3.1): account selector and
 * collapse toggle at the top, "Log trade" as the one filled button, search,
 * then the grouped navigation. Collapsed it is a 56 px icon rail whose labels
 * become tooltips. Below `lg` the mobile shell shows the navigation instead.
 */
export function Sidebar({
  displayName,
  accounts,
  selectedAccountId,
  collapsed,
  animate,
  onToggle,
  onOpenPalette,
}: ShellProps & {
  collapsed: boolean;
  animate: boolean;
  onToggle: () => void;
  onOpenPalette: () => void;
}) {
  const itemShape = collapsed ? "w-9 justify-center" : "gap-2.5 px-2";

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex ${
        collapsed ? "w-14" : "w-60"
      } ${animate ? "transition-[width] duration-200 ease-out" : ""}`}
    >
      {/* Collapsed, the toggle sits above the account; expanded, beside it. */}
      <div
        className={`flex gap-1 p-2 ${collapsed ? "flex-col-reverse items-center" : "items-center"}`}
      >
        <div className={collapsed ? "" : "min-w-0 flex-1"}>
          <AccountSwitcher
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            placement={collapsed ? "rail" : "sidebar"}
          />
        </div>
        <RailTip
          collapsed={collapsed}
          label={
            <>
              Expand sidebar <Kbd>[</Kbd>
            </>
          }
        >
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            onClick={onToggle}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70 transition-[color,background-color,scale] duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-ring active:scale-95"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </RailTip>
      </div>

      <div
        className={`flex flex-col gap-1 px-2 pb-2 ${collapsed ? "items-center" : ""}`}
      >
        <RailTip
          collapsed={collapsed}
          label={
            <>
              Log trade <Kbd>C</Kbd>
            </>
          }
        >
          <Link
            href={LOG_TRADE_HREF}
            aria-label={collapsed ? "Log trade" : undefined}
            className={`${SIDEBAR_ITEM_CLASS} ${itemShape} bg-primary font-medium text-primary-foreground shadow-sm hover:bg-primary/85 active:bg-primary/75`}
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!collapsed && (
              <>
                Log trade
                <Kbd className="ml-auto">C</Kbd>
              </>
            )}
          </Link>
        </RailTip>
        <RailTip
          collapsed={collapsed}
          label={
            <>
              Search <Kbd>⌘K</Kbd>
            </>
          }
        >
          <button
            type="button"
            aria-label={collapsed ? "Search" : undefined}
            onClick={onOpenPalette}
            className={`${SIDEBAR_ITEM_CLASS} ${itemShape} text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground`}
          >
            <CommandIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {!collapsed && (
              <>
                Search
                <Kbd className="ml-auto">⌘K</Kbd>
              </>
            )}
          </button>
        </RailTip>
      </div>

      <SidebarContent displayName={displayName} collapsed={collapsed} />
    </aside>
  );
}

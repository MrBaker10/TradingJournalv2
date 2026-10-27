"use client";

import { LogOut } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactElement, useTransition } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth/auth-client";
import { isActiveHref, navGroups } from "./nav-items";

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

/**
 * What the sidebar holds below its top controls — the grouped navigation and
 * the user block — shared by the desktop sidebar and the mobile drawer, so
 * there is one navigation, not two. `onNavigate` lets the drawer close when a
 * page is chosen, the current one included.
 */
export function SidebarContent({
  displayName,
  collapsed = false,
  onNavigate,
}: {
  displayName: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, startSignOut] = useTransition();

  // No confirmation: signing out loses nothing.
  function signOut() {
    startSignOut(async () => {
      await authClient.signOut();
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <>
      <nav
        aria-label="Main"
        className={`flex flex-1 flex-col overflow-x-hidden overflow-y-auto px-2 py-2 ${
          collapsed ? "items-center" : ""
        }`}
      >
        {navGroups.map((group, index) => (
          <div
            key={group.label}
            className={`flex flex-col gap-0.5 ${collapsed ? "items-center" : "mb-4"}`}
          >
            {collapsed ? (
              index > 0 && (
                <div
                  aria-hidden="true"
                  className="my-1.5 h-px w-6 bg-sidebar-border"
                />
              )
            ) : (
              <div className="px-2 pb-1 text-[11px] font-medium whitespace-nowrap text-muted-foreground">
                {group.label}
              </div>
            )}
            {group.items.map(({ href, label, icon: Icon }) => {
              const isActive = isActiveHref(href, pathname);
              return (
                <RailTip key={href} collapsed={collapsed} label={label}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={isActive ? "page" : undefined}
                    aria-label={collapsed ? label : undefined}
                    className={`${SIDEBAR_ITEM_CLASS} ${
                      collapsed
                        ? "relative h-9 w-9 justify-center"
                        : "gap-2.5 px-2 whitespace-nowrap"
                    } ${
                      isActive
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                    }`}
                  >
                    <Icon
                      className={`shrink-0 opacity-80 ${collapsed ? "h-[18px] w-[18px]" : "h-4 w-4"}`}
                      aria-hidden="true"
                    />
                    {!collapsed && label}
                    <PendingDot collapsed={collapsed} />
                  </Link>
                </RailTip>
              );
            })}
          </div>
        ))}
      </nav>

      <div
        className={`flex items-center gap-1 border-t border-sidebar-border p-2 ${
          collapsed ? "flex-col" : ""
        }`}
      >
        {!collapsed && (
          <>
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium"
            >
              {displayName.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px]">
              {displayName}
            </span>
          </>
        )}
        <RailTip collapsed={collapsed} label="Sign out">
          <button
            type="button"
            aria-label="Sign out"
            onClick={signOut}
            disabled={isSigningOut}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70 transition-[color,background-color,scale] duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-ring active:scale-95"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </RailTip>
      </div>
    </>
  );
}

/** Answers a click at once while a dynamic page is still loading. */
function PendingDot({ collapsed }: { collapsed: boolean }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      className={`h-1.5 w-1.5 shrink-0 rounded-full bg-current transition-opacity duration-150 ${
        collapsed ? "absolute top-1 right-1" : "ml-auto"
      } ${pending ? "animate-pulse opacity-70" : "opacity-0"}`}
    />
  );
}

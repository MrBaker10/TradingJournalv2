"use client";

import { LogOut } from "lucide-react";
import { useLinkStatus } from "next/link";
import { useTranslations } from "next-intl";
import { type RefObject, useTransition } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { Link, usePathname, useRouter } from "@/lib/i18n/navigation";
import type { ThemePick } from "@/lib/theme";
import { isActiveHref, navGroups } from "./nav-items";
import {
  RailTip,
  SIDEBAR_ICON_BUTTON_CLASS,
  SIDEBAR_ITEM_CLASS,
} from "./sidebar-parts";
import { ThemeMenu } from "./theme-menu";

/**
 * What the sidebar holds below its top controls — the grouped navigation and
 * the user block — shared by the desktop sidebar and the mobile drawer, so
 * there is one navigation, not two. `onNavigate` lets the drawer close when a
 * page is chosen, the current one included.
 */
export function SidebarContent({
  displayName,
  theme,
  collapsed = false,
  onNavigate,
  menuContainer,
}: {
  displayName: string;
  theme: ThemePick;
  collapsed?: boolean;
  /** The drawer's <dialog>, for menus that would otherwise sit behind it. */
  menuContainer?: RefObject<HTMLElement | null>;
  onNavigate?: () => void;
}) {
  const t = useTranslations();
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
        aria-label={t("nav.main")}
        className={`flex flex-1 flex-col overflow-x-hidden overflow-y-auto px-2 py-2 ${
          collapsed ? "items-center" : ""
        }`}
      >
        {navGroups.map((group, index) => (
          <div
            key={group.key}
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
                {t(`nav.groups.${group.key}`)}
              </div>
            )}
            {group.items.map(({ href, key, icon: Icon }) => {
              const isActive = isActiveHref(href, pathname);
              const label = t(`nav.items.${key}`);
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
        <ThemeMenu
          theme={theme}
          collapsed={collapsed}
          container={menuContainer}
        />
        <RailTip collapsed={collapsed} label={t("shell.signOut")}>
          <button
            type="button"
            aria-label={t("shell.signOut")}
            onClick={signOut}
            disabled={isSigningOut}
            className={SIDEBAR_ICON_BUTTON_CLASS}
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

import {
  BarChart3,
  CalendarDays,
  Landmark,
  LayoutDashboard,
  ListChecks,
  type LucideIcon,
  NotebookText,
  Settings,
  TrendingUp,
  Wallet,
} from "lucide-react";

import type en from "@/lib/i18n/messages/en.json";

/** The item's label in the dictionary, under `nav.items`. */
export type NavItemKey = keyof (typeof en)["nav"]["items"];

export interface NavItem {
  key: NavItemKey;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  /** The group's label in the dictionary, under `nav.groups`. */
  key: keyof (typeof en)["nav"]["groups"];
  items: NavItem[];
}

/** The navigation by what the trader is doing (Design.md §3.1). */
export const navGroups: NavGroup[] = [
  {
    key: "daily",
    items: [
      { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
      { key: "journal", href: "/journal", icon: NotebookText },
      { key: "econCalendar", href: "/econ-calendar", icon: CalendarDays },
    ],
  },
  {
    key: "review",
    items: [
      { key: "analytics", href: "/analytics", icon: BarChart3 },
      { key: "progress", href: "/progress", icon: TrendingUp },
      { key: "ledger", href: "/ledger", icon: Wallet },
    ],
  },
  {
    key: "setUp",
    items: [
      { key: "strategies", href: "/strategies", icon: ListChecks },
      { key: "propFirms", href: "/prop-firms", icon: Landmark },
      { key: "settings", href: "/settings", icon: Settings },
    ],
  },
];

export const navItems: NavItem[] = navGroups.flatMap((group) => group.items);

/** Where "Log trade" leads, from the sidebar, the palette and the `C` key. */
export const LOG_TRADE_HREF = "/journal/new";
export const IMPORT_TRADES_HREF = "/journal/import";

/** Whether `pathname` is `href` itself or a page below it. */
export function isActiveHref(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The navigation item the current page belongs to, if any. */
export function activeNavItem(pathname: string): NavItem | undefined {
  return navItems.find((item) => isActiveHref(item.href, pathname));
}

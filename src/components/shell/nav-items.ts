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

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** The navigation by what the trader is doing (Design.md §3.1). */
export const navGroups: NavGroup[] = [
  {
    label: "Daily",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Trade Journal", href: "/journal", icon: NotebookText },
      { label: "Econ Calendar", href: "/econ-calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Review",
    items: [
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
      { label: "Progress", href: "/progress", icon: TrendingUp },
      { label: "Ledger", href: "/ledger", icon: Wallet },
    ],
  },
  {
    label: "Set up",
    items: [
      { label: "Strategies", href: "/strategies", icon: ListChecks },
      { label: "Prop Firm Rules", href: "/prop-firms", icon: Landmark },
      { label: "Settings", href: "/settings", icon: Settings },
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

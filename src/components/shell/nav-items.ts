import {
  BarChart3,
  CalendarDays,
  Landmark,
  LayoutDashboard,
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

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Trade Journal", href: "/journal", icon: NotebookText },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Progress", href: "/progress", icon: TrendingUp },
  { label: "Prop Firm Rules", href: "/prop-firms", icon: Landmark },
  { label: "Econ Calendar", href: "/econ-calendar", icon: CalendarDays },
  { label: "Ledger", href: "/ledger", icon: Wallet },
  { label: "Settings", href: "/settings", icon: Settings },
];

/** Whether `pathname` is `href` itself or a page below it. */
export function isActiveHref(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The navigation item the current page belongs to, if any. */
export function activeNavItem(pathname: string): NavItem | undefined {
  return navItems.find((item) => isActiveHref(item.href, pathname));
}

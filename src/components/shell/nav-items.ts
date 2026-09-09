import {
  BarChart3,
  CalendarDays,
  Landmark,
  LayoutDashboard,
  type LucideIcon,
  NotebookText,
  Settings,
  TrendingUp,
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
  { label: "Settings", href: "/settings", icon: Settings },
];

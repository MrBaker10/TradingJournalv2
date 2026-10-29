import { type LucideIcon, Monitor, Moon, Sun } from "lucide-react";
import type { ThemePick } from "@/lib/theme";

/**
 * Each theme pick's name and icon (Design.md §3.1), shared by the sidebar's
 * theme menu and the command palette.
 */
export const THEME_OPTIONS: Record<
  ThemePick,
  { label: string; icon: LucideIcon }
> = {
  dark: { label: "Dark", icon: Moon },
  light: { label: "Light", icon: Sun },
  system: { label: "System", icon: Monitor },
};

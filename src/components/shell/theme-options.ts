import { type LucideIcon, Monitor, Moon, Sun } from "lucide-react";
import type { ThemePick } from "@/lib/theme";

/**
 * Each theme pick's icon (Design.md §3.1), shared by the sidebar's theme menu
 * and the command palette. Its name is `shell.themes.<pick>` in the
 * dictionary.
 */
export const THEME_ICONS: Record<ThemePick, LucideIcon> = {
  dark: Moon,
  light: Sun,
  system: Monitor,
};

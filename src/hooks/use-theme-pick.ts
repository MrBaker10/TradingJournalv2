"use client";

import { useOptimistic, useTransition } from "react";
import { setTheme } from "@/actions/theme";
import { notifyError } from "@/components/ui/toast";
import { useMessage } from "@/hooks/use-message";
import { THEME_PICKS, type ThemePick, themeBodyClass } from "@/lib/theme";

/** Puts the pick's class on <body>, where the palettes sit (globals.css). */
function applyThemeClass(pick: ThemePick) {
  const { classList } = document.body;
  classList.remove(...THEME_PICKS.map(themeBodyClass));
  classList.add(themeBodyClass(pick));
}

/**
 * The theme pick and how to change it (Design.md §3.1). The class on <body>
 * changes at once, without a transition; the action then stores the cookie and
 * the re-rendered layout hands the same pick back as `current`. If the action
 * fails, the previous class returns, unless a later pick replaced this one
 * meanwhile, and a toast says so.
 */
export function useThemePick(current: ThemePick) {
  const [pick, setOptimisticPick] = useOptimistic(current);
  const [, startTransition] = useTransition();
  const message = useMessage();

  function choose(next: ThemePick) {
    if (next === pick) return;
    applyThemeClass(next);
    startTransition(async () => {
      setOptimisticPick(next);
      const result = await setTheme(next);
      if (!result.success) {
        if (document.body.classList.contains(themeBodyClass(next))) {
          applyThemeClass(current);
        }
        notifyError(message(result.error));
      }
    });
  }

  return { pick, choose };
}

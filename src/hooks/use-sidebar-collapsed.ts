"use client";

import { useCallback, useEffect, useState } from "react";

// A per-browser view preference (Design.md §3.1), not user data: it does not
// belong in Postgres.
const STORAGE_KEY = "sidebar-collapsed";

/**
 * Whether the desktop sidebar is the collapsed icon rail, remembered in
 * `localStorage`. The server cannot know it, so the first paint is expanded
 * and the stored state applies after mount. `animate` turns true only once
 * the trader toggles, so that restoring the stored state does not play the
 * width transition on every page load.
 */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // Storage blocked (private mode, policy): stay expanded.
    }
  }, []);

  // Only a toggle stores; restoring the stored state has nothing to write.
  useEffect(() => {
    if (!animate) return;
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // Storage blocked: the toggle still works for this page view.
    }
  }, [animate, collapsed]);

  const toggle = useCallback(() => {
    setAnimate(true);
    setCollapsed((value) => !value);
  }, []);

  return { collapsed, animate, toggle };
}

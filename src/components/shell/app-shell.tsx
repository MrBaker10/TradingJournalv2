"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";
import { isFieldTarget, shellShortcut } from "@/lib/shell/shortcuts";
import { CommandPalette } from "./command-palette";
import { MobileShell } from "./mobile-shell";
import { LOG_TRADE_HREF } from "./nav-items";
import { type ShellProps, Sidebar } from "./sidebar";

/**
 * The shell around every page behind the session (Design.md §3.1): the
 * sidebar from `lg`, the top bar and drawer below it, the ⌘K palette, the
 * `[` and `C` keys, and the practice fog over the content area.
 */
export function AppShell({
  practiceSelected,
  children,
  ...shell
}: ShellProps & { practiceSelected: boolean; children: ReactNode }) {
  const router = useRouter();
  const { collapsed, animate, toggle } = useSidebarCollapsed();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;
      const shortcut = shellShortcut(event, isFieldTarget(event.target));
      if (shortcut === null) return;
      event.preventDefault();
      if (shortcut === "toggleSidebar") toggle();
      if (shortcut === "logTrade") router.push(LOG_TRADE_HREF);
      if (shortcut === "togglePalette") setPaletteOpen((open) => !open);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, toggle]);

  return (
    <TooltipProvider delay={300}>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <MobileShell {...shell} />
        <Sidebar
          {...shell}
          collapsed={collapsed}
          animate={animate}
          onToggle={toggle}
          onOpenPalette={() => setPaletteOpen(true)}
        />
        <main className="relative min-w-0 flex-1">
          {/* Fixed to the viewport so it stays while the page scrolls; it
              starts below the top bar on a phone and beside the sidebar from
              `lg`, following the sidebar's width as it collapses. */}
          {practiceSelected && (
            <div
              aria-hidden="true"
              className={`pointer-events-none fixed inset-x-0 top-14 bottom-0 z-30 shadow-practice-fog lg:top-0 ${
                collapsed ? "lg:left-14" : "lg:left-60"
              } ${animate ? "transition-[left] duration-200 ease-out" : ""}`}
            />
          )}
          <div className="mx-auto max-w-[1440px] px-4 py-4 lg:px-6 lg:py-6">
            {children}
          </div>
        </main>
      </div>
      <CommandPalette
        accounts={shell.accounts}
        theme={shell.theme}
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
      />
    </TooltipProvider>
  );
}

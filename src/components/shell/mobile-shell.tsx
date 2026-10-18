"use client";

import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AccountSwitcher } from "./account-switcher";
import { activeNavItem } from "./nav-items";
import type { ShellProps } from "./sidebar";
import { SidebarContent } from "./sidebar-content";

// Tailwind's `lg`: from here the desktop sidebar takes over (Design.md §4.1).
const DESKTOP_QUERY = "(min-width: 64rem)";

const DRAWER_TRANSITION = { duration: 0.24, ease: [0.2, 0.7, 0.3, 1] } as const;

// The card gradient is translucent; over page content the bar and the panel
// lay it on the page background so nothing shows through.
const OPAQUE_CARD = "[background:var(--gradient-card),var(--color-bg)]";

const ICON_BUTTON_CLASS =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-ctl text-fg-muted transition-colors hover:bg-nav-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-[var(--color-cyan)] focus-visible:outline-offset-2";

/**
 * Below `lg`: a top bar with the page title, a menu button that opens the
 * sidebar's content as a drawer, and the account selector, always in view
 * (Design.md §4.1, §4.12). The drawer is a native modal
 * `<dialog>`, so the page behind is inert, focus stays inside and returns to
 * the menu button on close. It closes after its exit animation has run, except
 * at `lg`, where it is hidden at once and closes at once.
 */
export function MobileShell({
  displayName,
  accounts,
  selectedAccountId,
  practiceSelected,
}: ShellProps & { practiceSelected: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const title = activeNavItem(pathname)?.label;

  useEffect(() => {
    if (open && !dialogRef.current?.open) dialogRef.current?.showModal();
  }, [open]);

  // Back/Forward or a sign-out redirect change the page without a click.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs per page change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP_QUERY);
    // Hidden by `lg:hidden` already, so nothing would show an exit; closing
    // right away keeps an invisible modal from leaving the page inert.
    function closeOnDesktop() {
      if (!desktop.matches) return;
      setOpen(false);
      dialogRef.current?.close();
    }
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  // A modal dialog does not stop the document behind it from scrolling.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <header
        className={`card-surface edge ${OPAQUE_CARD} sticky top-4 z-30 flex h-14 items-center gap-2 px-3 lg:hidden ${
          // The practice stripe sits beside the card's own shadow (§4.12).
          practiceSelected
            ? "shadow-[var(--shadow-practice),var(--shadow-card)]"
            : ""
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          aria-expanded={open}
          aria-controls="mobile-navigation"
          className={ICON_BUTTON_CLASS}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="min-w-0 flex-1 truncate text-[15px] text-fg">
          {title}
        </span>
        <AccountSwitcher
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          placement="topBar"
        />
      </header>

      <dialog
        id="mobile-navigation"
        ref={dialogRef}
        aria-label="Navigation"
        onCancel={(event) => {
          // Escape: animate out first, then close (onExitComplete).
          event.preventDefault();
          setOpen(false);
        }}
        // The browser may close it without a cancelable `cancel`, e.g. on a
        // repeated Escape; the state has to follow, or the menu cannot reopen.
        onClose={() => setOpen(false)}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-fg backdrop:bg-transparent lg:hidden"
      >
        <AnimatePresence onExitComplete={() => dialogRef.current?.close()}>
          {open && (
            <>
              <motion.div
                key="backdrop"
                aria-hidden="true"
                onClick={() => setOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={DRAWER_TRANSITION}
                className="fixed inset-0 bg-black/60"
              />
              <motion.div
                key="panel"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={DRAWER_TRANSITION}
                className={`card-surface edge ${OPAQUE_CARD} fixed inset-y-0 left-0 flex w-[min(85vw,300px)] flex-col overflow-y-auto`}
              >
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close navigation"
                  className={`${ICON_BUTTON_CLASS} absolute top-3 right-3 z-10`}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
                <SidebarContent
                  displayName={displayName}
                  onNavigate={() => setOpen(false)}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </dialog>
    </>
  );
}

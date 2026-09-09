"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { setSelectedAccount } from "@/actions/accounts";
import { groupAccountsForSwitcher } from "@/domain/accounts";

export interface SwitcherAccount {
  id: number;
  name: string;
  isPractice: boolean;
  sortOrder: number;
  archivedAt: Date | null;
}

interface AccountSwitcherProps {
  accounts: SwitcherAccount[];
  selectedAccountId: number | null;
}

export function AccountSwitcher({
  accounts,
  selectedAccountId,
}: AccountSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    left: number;
    bottom: number;
    width: number;
  } | null>(null);
  const [, startTransition] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !buttonRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const { real, practice } = groupAccountsForSwitcher(accounts);
  const selected = accounts.find((account) => account.id === selectedAccountId);
  const label = selected ? selected.name : "All accounts";

  function toggleOpen() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Opens upward: the switcher sits near the bottom of the sidebar, and
      // the sidebar's own overflow-y-auto would clip a dropdown positioned
      // relative to it, so this portals to document.body and anchors to the
      // button's screen position instead.
      setMenuPosition({
        left: rect.left,
        bottom: window.innerHeight - rect.top + 4,
        width: rect.width,
      });
    }
    setOpen((value) => !value);
  }

  function select(accountId: number | null) {
    setOpen(false);
    startTransition(async () => {
      await setSelectedAccount({ accountId });
    });
  }

  return (
    <div className="relative mx-3 mt-3">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        className="flex w-full flex-col gap-0.5 rounded-ctl bg-[image:var(--gradient-inset)] px-3 py-2 text-left"
      >
        <span className="cap">Account</span>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-fg">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={selectedAccountId ?? "all"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="truncate"
            >
              {label}
            </motion.span>
          </AnimatePresence>
          {selected?.isPractice && (
            <span className="cap-practice shrink-0 rounded-xs px-1.5 py-0.5">
              Practice
            </span>
          )}
        </span>
      </button>

      {open &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              left: menuPosition.left,
              bottom: menuPosition.bottom,
              width: menuPosition.width,
            }}
            className="z-20 flex flex-col gap-0.5 rounded-ctl border border-white/12 bg-[image:var(--gradient-card)] p-1.5 shadow-[var(--shadow-card)]"
          >
            <button
              type="button"
              onClick={() => select(null)}
              className={`flex flex-col rounded-xs px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-nav-hover ${
                selectedAccountId === null ? "text-fg" : "text-fg-muted"
              }`}
            >
              All accounts
              <span className="text-xs text-fg-subtle">
                All real accounts combined
              </span>
            </button>

            {real.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => select(account.id)}
                className={`rounded-xs px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-nav-hover ${
                  selectedAccountId === account.id ? "text-fg" : "text-fg-muted"
                }`}
              >
                {account.name}
              </button>
            ))}

            {practice.length > 0 && (
              <div className="mx-1 my-1 h-px bg-[linear-gradient(to_right,transparent,var(--color-divider-glow),transparent)] shadow-[0_0_8px_var(--color-divider-glow)]" />
            )}

            {practice.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => select(account.id)}
                className={`flex items-center gap-1.5 rounded-xs px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-nav-hover ${
                  selectedAccountId === account.id ? "text-fg" : "text-fg-muted"
                }`}
              >
                {account.name}
                <span className="cap-practice shrink-0 rounded-xs px-1.5 py-0.5">
                  Practice
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

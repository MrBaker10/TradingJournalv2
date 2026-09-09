"use client";

import { LogOut } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import type { SwitcherAccount } from "@/components/shell/account-switcher";
import { AccountSwitcher } from "@/components/shell/account-switcher";
import { navItems } from "./nav-items";

interface SidebarProps {
  displayName: string;
  accounts: SwitcherAccount[];
  selectedAccountId: number | null;
}

export function Sidebar({
  displayName,
  accounts,
  selectedAccountId,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="card-surface edge sticky top-6 flex h-[calc(100vh-48px)] w-[260px] shrink-0 flex-col overflow-y-auto">
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <div className="h-7 w-7 shrink-0 rounded-xs bg-[image:var(--gradient-info)] shadow-[var(--shadow-neon)]" />
        <span className="cap">Trading Journal</span>
      </div>

      <div className="mx-5 h-px bg-[linear-gradient(to_right,transparent,var(--color-divider-glow),transparent)] shadow-[0_0_8px_var(--color-divider-glow)]" />

      <nav aria-label="Main" className="flex flex-1 flex-col gap-1 px-3 py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Fragment key={href}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex h-10 items-center gap-3 rounded-ctl px-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-cyan)] focus-visible:outline-offset-2 ${
                  isActive
                    ? "text-fg"
                    : "text-fg-muted hover:bg-nav-hover hover:text-fg"
                }`}
              >
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.85 }}
                      transition={{
                        type: "spring",
                        stiffness: 100,
                        damping: 18,
                        mass: 0.8,
                      }}
                      className="absolute inset-0 rounded-ctl bg-[image:var(--gradient-inset)] shadow-[inset_0_0_0_1px_var(--color-nav-active-ring)]"
                    />
                  )}
                </AnimatePresence>
                <span
                  className={`relative z-10 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-xs ${
                    isActive
                      ? "bg-[image:var(--gradient-info)] shadow-[var(--shadow-neon)]"
                      : "bg-nav-idle"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="relative z-10">{label}</span>
              </Link>
              {href === "/progress" && (
                <div className="mx-2 my-2 h-px bg-[linear-gradient(to_right,transparent,var(--color-divider-glow),transparent)] shadow-[0_0_8px_var(--color-divider-glow)]" />
              )}
            </Fragment>
          );
        })}
      </nav>

      <AccountSwitcher
        accounts={accounts}
        selectedAccountId={selectedAccountId}
      />

      <div className="m-3 flex items-center justify-between rounded-ctl bg-[image:var(--gradient-inset)] px-3 py-2.5">
        <span className="truncate text-sm text-fg">{displayName}</span>
        <button
          type="button"
          aria-label="Sign out"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xs text-fg-muted transition-colors hover:bg-nav-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-[var(--color-cyan)] focus-visible:outline-offset-2"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}

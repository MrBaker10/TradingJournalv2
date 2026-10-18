import type { ReactNode } from "react";
import { MobileShell } from "@/components/shell/mobile-shell";
import { Sidebar } from "@/components/shell/sidebar";
import { listActiveAccountsForSwitcher } from "@/db/queries/accounts";
import { getCurrentUser } from "@/lib/auth/get-current-user";

// Every page behind the session renders at request time. Route segment config
// in a layout applies to every segment below it, so this one line covers all
// seven pages — including the ones that are still empty and the ones that do
// not exist yet, which is the point: a new page cannot forget it.
//
// Without it Next prerenders at build time and freezes one user's figures into
// the bundle, and the build itself needs a reachable database. See the
// "Per-user pages are dynamic" entry in project-overview.md; it is also why
// cacheComponents stays off.
//
// This layout reads the accounts for the sidebar and the account switcher, so
// it could not be static anyway.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const accounts = await listActiveAccountsForSwitcher(user.id);
  const selectedAccount = accounts.find(
    (account) => account.id === user.selectedAccountId,
  );

  const shell = {
    displayName: user.displayName,
    accounts,
    selectedAccountId: user.selectedAccountId,
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-4 lg:flex-row lg:px-6 lg:py-6">
      <MobileShell {...shell} />
      <Sidebar {...shell} />
      {/* The right padding is the scrollbar's lane. Without it the bar of this
          own scroll container sits on the right edge of every card, and the
          content ends flush against the screen. */}
      <main
        className={`min-w-0 flex-1 lg:sticky lg:top-6 lg:h-[calc(100vh-48px)] lg:overflow-y-auto lg:pr-4 ${
          selectedAccount?.isPractice ? "shadow-[var(--shadow-practice)]" : ""
        }`}
      >
        {children}
      </main>
    </div>
  );
}

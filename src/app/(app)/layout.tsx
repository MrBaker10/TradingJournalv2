import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { listActiveAccountsForSwitcher } from "@/db/queries/accounts";
import { getCurrentUser } from "@/lib/auth/get-current-user";

// Every page behind the session renders at request time. Route segment config
// in a layout applies to every segment below it, so this one line covers all
// eight pages — including the ones that are still empty and the ones that do
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
  const practiceSelected =
    accounts.find((account) => account.id === user.selectedAccountId)
      ?.isPractice ?? false;

  return (
    <AppShell
      displayName={user.displayName}
      accounts={accounts}
      selectedAccountId={user.selectedAccountId}
      practiceSelected={practiceSelected}
    >
      {children}
    </AppShell>
  );
}

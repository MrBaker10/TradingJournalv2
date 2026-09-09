import type { ReactNode } from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { listActiveAccountsForSwitcher } from "@/db/queries/accounts";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const accounts = await listActiveAccountsForSwitcher(user.id);
  const selectedAccount = accounts.find(
    (account) => account.id === user.selectedAccountId,
  );

  return (
    <div className="flex gap-6 px-6 py-6">
      <Sidebar
        displayName={user.displayName}
        accounts={accounts}
        selectedAccountId={user.selectedAccountId}
      />
      <main
        className={`sticky top-6 h-[calc(100vh-48px)] min-w-0 flex-1 overflow-y-auto ${
          selectedAccount?.isPractice ? "shadow-[var(--shadow-practice)]" : ""
        }`}
      >
        {children}
      </main>
    </div>
  );
}
